import { Briefcase, Users, Clock, Plus, Filter, Search, MoreVertical, ArrowUpRight, ArrowDownRight, MapPin, DollarSign, Calendar } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, getDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

const navItems = [
  { name: 'Dashboard', href: '/recruiter', icon: Briefcase },
  { name: 'Job Postings', href: '/recruiter/jobs', icon: Briefcase },
  { name: 'Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'Interviews', href: '/recruiter/interviews', icon: Clock },
];

export default function RecruiterDashboard() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantData, setApplicantData] = useState([
    { name: 'Mon', applicants: 0 },
    { name: 'Tue', applicants: 0 },
    { name: 'Wed', applicants: 0 },
    { name: 'Thu', applicants: 0 },
    { name: 'Fri', applicants: 0 },
    { name: 'Sat', applicants: 0 },
    { name: 'Sun', applicants: 0 },
  ]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    interviewsToday: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const recruiterId = auth.currentUser.uid;

    // Fetch Jobs
    const jobsQuery = query(collection(db, 'jobs'), where('recruiterId', '==', recruiterId));
    const unsubscribeJobs = onSnapshot(jobsQuery, async (snapshot) => {
      const allApplications: any[] = [];
      const jobsPromises = snapshot.docs.map(async (document) => {
        const jobData = document.data();
        let applicantsCount = 0;
        let newApplicantsCount = 0;

        try {
          const appsQuery = query(collection(db, 'applications'), where('jobId', '==', document.id));
          const appsSnapshot = await getDocs(appsQuery);
          applicantsCount = appsSnapshot.size;
          
          appsSnapshot.docs.forEach(doc => {
            allApplications.push(doc.data());
          });
          
          // Mock new applicants for now, or calculate based on appliedAt date
          // Let's say new applicants are those applied in the last 7 days
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          newApplicantsCount = appsSnapshot.docs.filter(doc => {
            const appliedAt = new Date(doc.data().appliedAt);
            return appliedAt > sevenDaysAgo;
          }).length;

        } catch (error) {
          console.error("Error fetching applicants count:", error);
        }

        return {
          id: document.id,
          ...jobData,
          applicants: applicantsCount,
          new: newApplicantsCount,
          status: jobData.status || 'Active',
          deadline: jobData.deadline ? new Date(jobData.deadline).toLocaleDateString() : 'N/A'
        };
      });

      const resolvedJobs = await Promise.all(jobsPromises);
      setActiveJobs(resolvedJobs);
      
      // Calculate applicantData for the chart (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const newApplicantData = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        
        const count = allApplications.filter(app => {
          const appDate = new Date(app.appliedAt);
          return appDate.getDate() === d.getDate() && 
                 appDate.getMonth() === d.getMonth() && 
                 appDate.getFullYear() === d.getFullYear();
        }).length;
        
        newApplicantData.push({ name: dayName, applicants: count });
      }
      setApplicantData(newApplicantData);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        activeJobs: resolvedJobs.filter(j => j.status === 'Active' || j.status === 'open').length,
        totalApplicants: resolvedJobs.reduce((sum, job) => sum + job.applicants, 0)
      }));
    });

    // Fetch Interviews
    const interviewsQuery = query(collection(db, 'interviews'), where('recruiterId', '==', recruiterId));
    const unsubscribeInterviews = onSnapshot(interviewsQuery, async (snapshot) => {
      try {
        const interviewsData = await Promise.all(snapshot.docs.map(async (interviewDoc) => {
          const data = interviewDoc.data();
          let candidateName = 'Unknown Candidate';
          let roleTitle = 'Unknown Role';

          if (data.studentId) {
            try {
              const studentDoc = await getDoc(doc(db, 'users', data.studentId));
              if (studentDoc.exists()) {
                candidateName = studentDoc.data().name || candidateName;
              }
            } catch (e) {
              console.error("Error fetching student:", e);
            }
          }

          if (data.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
              if (jobDoc.exists()) {
                roleTitle = jobDoc.data().title || roleTitle;
              }
            } catch (e) {
              console.error("Error fetching job:", e);
            }
          }

          return {
            id: interviewDoc.id,
            ...data,
            candidate: candidateName,
            role: roleTitle,
            time: new Date(data.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: data.round || data.type || 'Interview',
            status: data.status || 'Scheduled'
          };
        }));

        const upcoming = interviewsData.filter(i => i.status === 'Scheduled' || i.status === 'Confirmed');
        setUpcomingInterviews(upcoming);
        
        // Update stats
        const today = new Date().toLocaleDateString();
        const todayInterviews = interviewsData.filter(i => new Date(i.scheduledAt).toLocaleDateString() === today);
        setStats(prev => ({
          ...prev,
          interviewsToday: todayInterviews.length
        }));
      } catch (error) {
        console.error("Error processing interviews:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeJobs();
      unsubscribeInterviews();
    };
  }, []);

  return (
    <DashboardLayout role="Recruiter" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back!</h2>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your job postings today.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Active Jobs', value: stats.activeJobs.toString(), icon: Briefcase, trend: '+2 this week', positive: true },
          { title: 'Total Applicants', value: stats.totalApplicants.toString(), icon: Users, trend: '+124 this week', positive: true },
          { title: 'Interviews Today', value: stats.interviewsToday.toString(), icon: Clock, trend: '-2 from yesterday', positive: false },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.trend}
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Applicant Growth</h3>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={applicantData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line type="monotone" dataKey="applicants" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Upcoming Interviews</h3>
          </div>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar h-[300px]">
            {loading ? (
              <div className="text-center text-slate-500 py-4">Loading interviews...</div>
            ) : upcomingInterviews.length === 0 ? (
              <div className="text-center text-slate-500 py-4">No upcoming interviews.</div>
            ) : (
              upcomingInterviews.map((interview) => (
                <div key={interview.id} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {interview.candidate.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">{interview.candidate}</h4>
                    <p className="text-xs text-slate-500 truncate">{interview.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{interview.time}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${interview.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {interview.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              View Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Active Job Postings</h3>
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View All</button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading jobs...</div>
          ) : activeJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No active jobs found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location & Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applicants</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Deadline</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{job.title}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1">ID: #{job.id.substring(0, 6)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {job.location}
                      </div>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">{job.applicants}</span>
                        {job.new > 0 && (
                          <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                            +{job.new} new
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${job.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {job.status}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                          <Calendar className="w-3 h-3" />
                          {job.deadline}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
