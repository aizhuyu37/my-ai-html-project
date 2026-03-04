import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  User, Phone, Activity, Calendar, FileText, 
  Stethoscope, CheckCircle2, ClipboardList, 
  PlusCircle, PhoneCall, Clock, Download,
  LogOut, ShieldCheck, Lock, Camera, X, Database,
  PieChart, Activity as ActivityIcon, UserCheck
} from 'lucide-react';

// ==========================================
// 1. Supabase 云端数据库配置
// ==========================================
// 请在这里填入你的 Supabase URL 和 anon key
const supabaseUrl = 'https://fnigosszjcvxatpmanak.supabase.co;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaWdvc3N6amN2eGF0cG1hbmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzIzNTYsImV4cCI6MjA4ODIwODM1Nn0.vriSAJl4TDwuzG_Rf-nImxT2BgNaZhsiBu2g9bGqG1w;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. 核心主应用组件
// ==========================================
export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    if (session?.user) {
      setUser(session.user);
      // 从 users 表中获取额外信息（姓名、角色）
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        setUserProfile(data);
      } else {
        setUserProfile({ realName: '未知用户', phone: '无', role: 'user' });
      }
    } else {
      setUser(null);
      setUserProfile(null);
    }
    setIsAuthReady(true);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium"><Clock className="animate-spin mr-2" size={20}/> 连接云端服务器中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {!user || !userProfile ? (
        <AuthScreen />
      ) : (
        <MainDashboard user={user} userProfile={userProfile} />
      )}
    </div>
  );
}

// ==========================================
// 3. 登录 / 注册组件
// ==========================================
function AuthScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (phone.length < 8) { setErrorMsg('请输入正确的手机号'); setLoading(false); return; }
    if (password.length < 6) { setErrorMsg('密码至少需要6位'); setLoading(false); return; }

    // 伪装邮箱以适应 Auth 体系
    const email = `${phone}@medical-system.local`;

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!realName.trim()) throw new Error('请输入真实姓名');
        
        let role = 'user';
        if (isAdminRegister) {
          if (adminCode !== 'admin123') throw new Error('无效的邀请码，无法注册为医护人员。');
          role = 'admin';
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('注册失败，请重试');

        // 将用户信息存入 users 表
        const { error: dbError } = await supabase.from('users').insert([{
          id: authData.user.id,
          realName: realName.trim(),
          phone: phone,
          role: role,
          createdAt: Date.now()
        }]);
        
        if (dbError) throw dbError;
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes('无效的邀请码') || err.message.includes('真实姓名')) setErrorMsg(err.message);
      else if (err.message.includes('already registered')) setErrorMsg('该手机号已注册，请直接登录');
      else if (err.message.includes('Invalid login credentials')) setErrorMsg('手机号或密码错误');
      else setErrorMsg('云端连接失败，请检查配置或稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <Stethoscope size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">术后回访系统</h1>
          <p className="text-sm text-slate-500 mt-2">{isLoginMode ? '欢迎回来，请登录您的账号' : '首次填报请注册新账号'}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
            <ShieldCheck size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">真实姓名</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-slate-400" /></div>
                <input type="text" required={!isLoginMode} value={realName} onChange={(e)=>setRealName(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="请输入您的真实姓名" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone size={16} className="text-slate-400" /></div>
              <input type="tel" required value={phone} onChange={(e)=>setPhone(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="请输入11位手机号" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={16} className="text-slate-400" /></div>
              <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="请输入密码(最少6位)" />
            </div>
          </div>

          {!isLoginMode && (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={isAdminRegister} onChange={(e) => setIsAdminRegister(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <span className="text-sm text-slate-600 font-medium">医护人员内部通道 (患者勿勾选)</span>
              </label>
              
              {isAdminRegister && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ShieldCheck size={16} className="text-amber-500" /></div>
                    <input type="password" required={isAdminRegister} value={adminCode} onChange={(e)=>setAdminCode(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="请输入科室授权邀请码" />
                  </div>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-medium shadow-sm transition-all flex justify-center items-center gap-2 mt-4">
            {loading ? <Clock className="animate-spin" size={18} /> : null}
            {isLoginMode ? '登 录' : '注 册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => {setIsLoginMode(!isLoginMode); setErrorMsg(''); setIsAdminRegister(false); setAdminCode(''); setRealName('');}} className="text-sm text-blue-600 hover:underline font-medium">
            {isLoginMode ? '首次填报？点击注册账号' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. 工作台组件 (主界面)
// ==========================================
function MainDashboard({ user, userProfile }) {
  const [activeTab, setActiveTab] = useState('new');
  const [records, setRecords] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef(null);

  // 获取云端数据
  const fetchRecords = async () => {
    setIsSyncing(true);
    try {
      let query = supabase.from('patients').select('*').order('timestamp', { ascending: false });
      
      // 如果不是管理员，只能看自己的数据
      if (userProfile.role !== 'admin') {
        query = query.eq('authorId', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("获取数据失败:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [userProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const initialFormState = {
    patientName: '', attendingDoctor: '', phone: '', surgeryType: '', surgeryDate: '',
    q1_symptoms: '无', q2_activity: '否，活动自如', q3_status: '良好',
    q4_wound: '正常', q5_medication: '按时使用', q6_exudate: '无',
    q7_implant: '无异常', remark: '', photoBase64: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
            setFormData(prev => ({ ...prev, photoBase64: compressedBase64 }));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newRecord = {
      ...formData,
      timestamp: Date.now(),
      followUpTime: new Date().toLocaleString(),
      authorId: user.id,
      authorName: userProfile.realName,
      authorPhone: userProfile.phone
    };

    try {
      const { error } = await supabase.from('patients').insert([newRecord]);
      if (error) throw error;

      setFormData(initialFormState);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setActiveTab('history');
      fetchRecords(); // 刷新列表
    } catch (error) {
      alert("上传云端失败，请检查网络");
      console.error(error);
    }
  };

  const exportToCSV = () => {
    if (userProfile.role !== 'admin') { alert("您没有导出数据的权限。"); return; }
    if (records.length === 0) return;
    
    const headers = [
      '录入人姓名', '录入人手机', '回访时间', '患者姓名', '联系电话', '主治医生', '手术/治疗术式', '手术/治疗时间', 
      '1.局部症状', '2.日常活动', '3.精神/食欲/睡眠', '4.伤口情况', 
      '5.用药情况', '6.异常突发', '7.植入物', '补充备注'
    ];
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    records.forEach(r => {
      const row = [
        r.authorName, r.authorPhone, r.followUpTime, r.patientName, r.phone, r.attendingDoctor, r.surgeryType, r.surgeryDate,
        r.q1_symptoms, r.q2_activity, r.q3_status, r.q4_wound,
        r.q5_medication, r.q6_exudate, r.q7_implant, (r.remark || '').replace(/\n/g, ' ')
      ];
      csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `患者回访记录汇总_${new Date().toLocaleDateString().replace(/\//g, '')}.csv`;
    link.click();
  };

  const RadioGroup = ({ name, options, label, required = true }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-3">{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="flex flex-wrap gap-3">
        {options.map(option => (
          <label key={option} className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-all ${formData[name] === option ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <input type="radio" name={name} value={option} checked={formData[name] === option} onChange={handleInputChange} className="hidden" />
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if(records.length === 0) return <div className="text-center py-12 text-slate-400">云端暂无数据可供分析</div>;

    const stats = {};
    records.forEach(r => {
        const type = r.surgeryType || '未分类术式';
        if (!stats[type]) { stats[type] = { total: 0, painOrFever: 0, woundIssue: 0, exudate: 0 }; }
        stats[type].total++;
        if (r.q1_symptoms !== '无') stats[type].painOrFever++;
        if (r.q4_wound !== '正常') stats[type].woundIssue++;
        if (r.q6_exudate !== '无') stats[type].exudate++;
    });

    return Object.keys(stats).map(type => {
        const data = stats[type];
        const painRate = Math.round((data.painOrFever / data.total) * 100);
        const woundRate = Math.round((data.woundIssue / data.total) * 100);
        const exudateRate = Math.round((data.exudate / data.total) * 100);

        return (
            <div key={type} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PieChart className="text-blue-500" size={20} /> {type} 
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">总计: {data.total} 例</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">疼痛/肿胀/发热 报告率</span><span className="font-medium">{data.painOrFever} 例 ({painRate}%)</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full" style={{ width: `${painRate}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">伤口红肿/破溃 报告率</span><span className="font-medium">{data.woundIssue} 例 ({woundRate}%)</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-red-400 h-2 rounded-full" style={{ width: `${woundRate}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">异常渗液/异味 报告率</span><span className="font-medium">{data.exudate} 例 ({exudateRate}%)</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-purple-400 h-2 rounded-full" style={{ width: `${exudateRate}%` }}></div></div>
                    </div>
                </div>
            </div>
        );
    });
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Stethoscope size={24} /></div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 hidden sm:block">术后回访系统</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                {userProfile.role === 'admin' ? <ShieldCheck size={16} className="text-amber-500"/> : <User size={16} className="text-blue-500"/>}
                {userProfile.realName}
              </span>
              <span className="text-xs text-slate-400">
                {/* 核心修改点：角色的名称区分 */}
                {userProfile.role === 'admin' ? '医护人员 (可查看全科室)' : '患者 (仅查看本人记录)'}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="退出登录">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex bg-slate-100 p-1 rounded-lg w-max mb-6 overflow-x-auto">
          <button onClick={() => setActiveTab('new')} className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <PlusCircle size={16} /> 填写回访
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ClipboardList size={16} /> 历史记录
          </button>
          {userProfile.role === 'admin' && (
            <button onClick={() => setActiveTab('analysis')} className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <ActivityIcon size={16} /> 数据分析
            </button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        
        {/* 新建回访表单 */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <User className="text-blue-500" size={20} /><h2 className="text-lg font-semibold text-slate-800">基本信息</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div><label className="block text-sm font-medium text-slate-700 mb-2">患者姓名 *</label><input type="text" name="patientName" required value={formData.patientName} onChange={handleInputChange} className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="输入姓名" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">联系电话 *</label><input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="输入联系电话" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">主治医生 *</label><input type="text" name="attendingDoctor" required value={formData.attendingDoctor} onChange={handleInputChange} className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="输入主治医生姓名" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">手术/治疗术式 *</label><input type="text" name="surgeryType" required value={formData.surgeryType} onChange={handleInputChange} className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：腹腔镜阑尾切除术" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">手术/治疗时间 *</label><input type="date" name="surgeryDate" required value={formData.surgeryDate} onChange={handleInputChange} className="block w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <FileText className="text-blue-500" size={20} /><h2 className="text-lg font-semibold text-slate-800">健康状况评估</h2>
              </div>
              <div className="space-y-2">
                <RadioGroup name="q1_symptoms" label="1. 手术/穿刺/治疗部位有没有疼痛、肿胀、发热、渗液、出血等？" options={['无', '轻微疼痛/肿胀', '有发热', '有渗液/出血', '其他异常']} />
                <RadioGroup name="q2_activity" label="2. 日常活动（抬手、走路、睡觉等）是否受影响？" options={['否，活动自如', '稍微受限', '严重受限，影响生活']} />
                <RadioGroup name="q3_status" label="3. 最近整体精神、食欲、睡眠好不好？" options={['良好', '一般', '精神差', '食欲差', '睡眠差']} />
                <RadioGroup name="q4_wound" label="4. 伤口局部皮肤颜色、有无红肿破溃？" options={['正常', '轻微发红', '有明显红肿', '有破溃']} />
                <RadioGroup name="q5_medication" label="5. 外用药物有没有按时使用？" options={['按时使用', '偶尔忘记', '未使用', '无外用药物']} />
                <RadioGroup name="q6_exudate" label="6. 有没有突然增多、变黄、异味、疼痛加重等情况？" options={['无', '渗液增多/变黄', '有异味', '疼痛加重']} />
                <RadioGroup name="q7_implant" label="7. 植入物位置是否异常、是否有明显紧绷感、疼痛？" options={['无异常', '有紧绷感', '有疼痛感', '感觉位置异常', '无植入物']} />
                
                <div className="mt-6 pt-4 border-t border-slate-50">
                  <label className="block text-sm font-medium text-slate-700 mb-2">其他补充备注 (选填)</label>
                  <textarea name="remark" value={formData.remark} onChange={handleInputChange} rows="3" className="block w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 sm:text-sm outline-none mb-3" placeholder="记录其他补充情况..."></textarea>
                  
                  {/* 图片上传区域 */}
                  <div className="mt-2">
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    {!formData.photoBase64 ? (
                      <button type="button" onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg w-full sm:w-64 h-24 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-500 transition-colors">
                        <Camera size={24} /> <span className="text-sm font-medium">现场拍摄 / 上传照片</span>
                      </button>
                    ) : (
                      <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-slate-50">
                        <img src={formData.photoBase64} alt="患者照片" className="h-32 w-auto object-cover rounded" />
                        <button type="button" onClick={() => setFormData(prev => ({...prev, photoBase64: ''}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-2 text-slate-600 bg-blue-50/50 border border-blue-100 px-5 py-3 rounded-lg w-full sm:w-auto shadow-sm">
                <PhoneCall className="text-blue-500" size={20} />
                <span className="font-medium text-sm">科室服务热线：<span className="text-blue-700 text-lg font-bold tracking-wide">0000-00000000</span></span>
              </div>
              <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-medium shadow-md transition-all flex justify-center items-center gap-2">
                <CheckCircle2 size={18} /> 保存并同步云端
              </button>
            </div>
          </form>
        )}

        {/* 历史记录列表 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                <Database className="text-blue-500" size={16} />
                {userProfile.role === 'admin' ? '全科室云端记录' : '我的云端记录'} (共 {records.length} 条)
              </span>
              {userProfile.role === 'admin' && records.length > 0 && (
                <button onClick={exportToCSV} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Download size={16} /> 导出表格
                </button>
              )}
            </div>

            {isSyncing ? (
              <div className="text-center py-12 text-slate-400"><Clock className="animate-spin inline mr-2" size={20}/> 正在获取云端数据...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100">
                <ClipboardList className="mx-auto text-slate-300 mb-3" size={48} />
                <p>云端暂无相关记录</p>
              </div>
            ) : (
              records.map(record => (
                <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                  {userProfile.role === 'admin' && (
                    <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-bl-xl font-medium border-b border-l border-blue-100 flex items-center gap-1">
                      <UserCheck size={14} /> 录入人: {record.authorName} ({record.authorPhone})
                    </div>
                  )}
                  
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 gap-4 mt-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {record.patientName} <span className="text-sm font-normal text-slate-500 flex items-center gap-1"><Phone size={14} /> {record.phone}</span>
                      </h3>
                      <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700"><Stethoscope size={14} className="text-blue-500" /> 主治: {record.attendingDoctor}</span>
                        <span className="flex items-center gap-1"><Activity size={14} className="text-blue-500" /> {record.surgeryType}</span>
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-blue-500" /> {record.surgeryDate}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full w-max">
                      <Clock size={12} /> {record.followUpTime}
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">1. 局部症状</span><span className={`font-medium ${record.q1_symptoms !== '无' ? 'text-amber-600' : 'text-slate-700'}`}>{record.q1_symptoms}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">2. 日常活动</span><span className={`font-medium ${record.q2_activity !== '否，活动自如' ? 'text-amber-600' : 'text-slate-700'}`}>{record.q2_activity}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">3. 精神/食欲</span><span className="font-medium text-slate-700">{record.q3_status}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">4. 伤口情况</span><span className={`font-medium ${record.q4_wound !== '正常' ? 'text-amber-600' : 'text-slate-700'}`}>{record.q4_wound}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">5. 用药情况</span><span className="font-medium text-slate-700">{record.q5_medication}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">6. 异常突发</span><span className={`font-medium ${record.q6_exudate !== '无' ? 'text-red-500' : 'text-slate-700'}`}>{record.q6_exudate}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-500 text-xs">7. 植入物</span><span className="font-medium text-slate-700">{record.q7_implant}</span></div>
                    </div>

                    {(record.remark || record.photoBase64) && (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row gap-4">
                        {record.remark && (
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-slate-500 text-xs">补充备注</span>
                            <span className="font-medium text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100">{record.remark}</span>
                          </div>
                        )}
                        {record.photoBase64 && (
                          <div className="flex-shrink-0 flex flex-col gap-1">
                            <span className="text-slate-500 text-xs">现场照片</span>
                            <img src={record.photoBase64} alt="患者照片" className="h-24 sm:h-32 w-auto object-cover rounded-lg border border-slate-200 cursor-zoom-in" onClick={() => {
                                const w = window.open(""); w.document.write(`<img src="${record.photoBase64}" style="max-width:100%; height:auto;">`);
                            }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 数据分析面板 */}
        {activeTab === 'analysis' && userProfile.role === 'admin' && (
          <div className="space-y-4">
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">云端数据大屏</h2>
                <p className="text-blue-100 text-sm">系统根据全科室的填报数据自动分类监控</p>
              </div>
              <PieChart className="text-blue-400/50" size={48} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAnalytics()}
            </div>
          </div>
        )}
      </main>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-400" />
          <span>已安全保存至云端数据库！</span>
        </div>
      )}
    </div>
  );
}


