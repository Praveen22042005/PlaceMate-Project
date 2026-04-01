import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Clock, 
  Building, 
  MapPin, 
  DollarSign,
  CalendarDays,
  Star,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, limit, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const navItems = [
  { name: 'Dashboard', href: '/student', icon: Briefcase },
  { name: 'My Applications', href: '/student/applications', icon: FileText },
  { name: 'Interviews', href: '/student/interviews', icon: Clock },
  { name: 'Profile', href: '/student/profile', icon: CheckCircle },
];

export default function StudentDashboard() {
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingReviews: 0,
    interviewsScheduled: 0,
    profileCompletion: 0
  });
  const [activityData, setActivityData] = useState<any[]>([]);

  const [studentSkills, setStudentSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const studentId = auth.currentUser.uid;

    // Fetch student profile
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', studentId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setStudentName(data.name || data.displayName || 'Student');
          setStudentSkills(data.skills || []);
          
          // Calculate profile completion (simple mock logic based on fields)
          let completion = 20; // Base completion
          if (data.skills && data.skills.length > 0) completion += 20;
          if (data.education && data.education.length > 0) completion += 20;
          if (data.experience && data.experience.length > 0) completion += 20;
          if (data.resumeUrl) completion += 20;
          
          setStats(prev => ({ ...prev, profileCompletion: completion }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();

    // Fetch Applications
    const appsQuery = query(collection(db, 'applications'), where('studentId', '==', studentId));
    const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
      const apps = snapshot.docs.map(doc => doc.data());
      
      setStats(prev => ({
        ...prev,
        totalApplications: apps.length,
        pendingReviews: apps.filter(app => app.status === 'reviewing' || app.status === 'applied').length
      }));

      // Calculate activity data for the last 14 days
      const days = [];
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d);
      }

      const newActivityData = days.map(d => {
        const count = apps.filter(app => {
          const appDate = new Date(app.appliedAt);
          return appDate.getDate() === d.getDate() && 
                 appDate.getMonth() === d.getMonth() && 
                 appDate.getFullYear() === d.getFullYear();
        }).length;
        
        return {
          name: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
          applications: count
        };
      });
      
      setActivityData(newActivityData);
    });

    // Fetch Interviews
    const interviewsQuery = query(collection(db, 'interviews'), where('studentId', '==', studentId));
    const unsubscribeInterviews = onSnapshot(interviewsQuery, (snapshot) => {
      const interviews = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({
        ...prev,
        interviewsScheduled: interviews.filter(i => i.status === 'scheduled' || i.status === 'Confirmed').length
      }));
    });

    return () => {
      unsubscribeApps();
      unsubscribeInterviews();
    };
  }, []);

  useEffect(() => {
    // Fetch Recommended Jobs
    const jobsQuery = query(collection(db, 'jobs'), limit(8));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        let match = 0;
        if (data.requirements && data.requirements.length > 0 && studentSkills.length > 0) {
          const matchingSkills = data.requirements.filter((req: string) => 
            studentSkills.some(skill => skill.toLowerCase() === req.toLowerCase())
          );
          match = Math.round((matchingSkills.length / data.requirements.length) * 100);
        } else {
          match = Math.floor(Math.random() * 20) + 60; // Fallback
        }

        return {
          id: doc.id,
          role: data.title,
          company: data.companyName || 'Company',
          location: data.location,
          salary: data.salary || 'Not specified',
          match: match,
          deadline: data.deadline ? new Date(data.deadline).toLocaleDateString() : 'N/A',
          skills: data.requirements ? data.requirements.slice(0, 3) : []
        };
      });
      setRecommendedJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recommended jobs:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeJobs();
    };
  }, [studentSkills]);

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {studentName}!</h2>
          <p className="text-slate-500 text-sm">Here is your placement journey overview for this week.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Browse All Jobs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Applications', value: stats.totalApplications.toString(), icon: FileText, color: 'blue', trend: 'Keep applying!' },
          { title: 'Pending Reviews', value: stats.pendingReviews.toString(), icon: Clock, color: 'amber', trend: 'Awaiting response' },
          { title: 'Interviews Scheduled', value: stats.interviewsScheduled.toString(), icon: CalendarDays, color: 'purple', trend: 'Prepare well!' },
          { title: 'Profile Completion', value: `${stats.profileCompletion}%`, icon: CheckCircle, color: 'emerald', trend: 'Looking good!' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </div>
            {stat.title === 'Profile Completion' ? (
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: stat.value }}></div>
              </div>
            ) : (
              <div className={`text-sm text-${stat.color}-600 font-medium flex items-center gap-1`}>
                <TrendingUp className="w-4 h-4" />
                {stat.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Application Activity</h3>
              <p className="text-sm text-slate-500">Track your engagement over the last 14 days</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none">
              <option>Last 14 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="applications" name="Applications" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recommended Jobs</h3>
              <p className="text-sm text-slate-500">Based on your skills</p>
            </div>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-500 py-4">Loading recommendations...</div>
            ) : recommendedJobs.length === 0 ? (
              <div className="text-center text-slate-500 py-4">No jobs found.</div>
            ) : (
              recommendedJobs.map((job, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md bg-white transition-all group cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{job.role}</h4>
                    <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                      {job.match}% Match
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3 font-medium">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{job.company}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{job.deadline}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.skills.map((skill: string) => (
                      <span key={skill} className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
