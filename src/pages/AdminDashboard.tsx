import { Users, Building, Briefcase, FileBarChart, TrendingUp, Download, CheckCircle, Clock, XCircle, ChevronRight, Star, FileText } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';

// we also need to redefine the start since I'm matching from line 5
const navItems = [
  { name: 'Dashboard', href: '/admin', icon: TrendingUp },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Selected':
    case 'Offered': return <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200"><CheckCircle className="w-3 h-3" /> {status}</span>;
    case 'Interview': return <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200"><Clock className="w-3 h-3" /> Interview</span>;
    case 'Assessment':
    case 'Under Review': return <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-200"><FileBarChart className="w-3 h-3" /> {status}</span>;
    case 'Applied': return <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200"><FileText className="w-3 h-3" /> Applied</span>;
    case 'Rejected': return <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-200"><XCircle className="w-3 h-3" /> Rejected</span>;
    case 'Withdrawn': return <span className="flex items-center gap-1 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200"><XCircle className="w-3 h-3" /> Withdrawn</span>;
    default: return null;
  }
};

export default function AdminDashboard() {
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [topRecruiters, setTopRecruiters] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent applications
    const appsQuery = query(collection(db, 'applications'), orderBy('appliedAt', 'desc'), limit(8));
    const unsubscribeApps = onSnapshot(appsQuery, async (snapshot) => {
      const studentIds = Array.from(new Set(snapshot.docs.map(d => d.data().studentId).filter(Boolean))) as string[];
      const jobIds = Array.from(new Set(snapshot.docs.map(d => d.data().jobId).filter(Boolean))) as string[];
      
      const studentsMap = new Map();
      const jobsMap = new Map();
      const companiesMap = new Map();

      const fetchChunks = async (ids: string[], collectionName: string, mapToPopulate: Map<string, any>) => {
        if (ids.length === 0) return;
        const chunks = [];
        for (let i = 0; i < ids.length; i += 10) {
          chunks.push(ids.slice(i, i + 10));
        }
        await Promise.all(chunks.map(async chunk => {
          const q = query(collection(db, collectionName), where(documentId(), 'in', chunk));
          const qs = await getDocs(q);
          qs.forEach(doc => mapToPopulate.set(doc.id, doc.data()));
        }));
      };

      try {
        await Promise.all([
          fetchChunks(studentIds, 'users', studentsMap),
          fetchChunks(jobIds, 'jobs', jobsMap)
        ]);

        // Second pass: fetch companies for the jobs we just fetched
        const companyIds = Array.from(new Set(Array.from(jobsMap.values()).map(j => j.companyId).filter(Boolean))) as string[];
        await fetchChunks(companyIds, 'companies', companiesMap);

      } catch (e) {
        console.error("Error batch fetching related data for applications:", e);
      }

      const resolvedApps = snapshot.docs.map(document => {
        const appData = document.data();
        let studentName = 'Unknown Student';
        let studentDept = 'Unknown Dept';
        let companyName = 'Unknown Company';
        let jobRole = 'Unknown Role';

        if (appData.studentId && studentsMap.has(appData.studentId)) {
          const s = studentsMap.get(appData.studentId);
          studentName = s.displayName || s.name || studentName;
          studentDept = s.dept || studentDept;
        }

        if (appData.jobId && jobsMap.has(appData.jobId)) {
          const j = jobsMap.get(appData.jobId);
          jobRole = j.title || jobRole;
          companyName = j.companyName || companyName;

          if (!j.companyName && j.companyId && companiesMap.has(j.companyId)) {
            companyName = companiesMap.get(j.companyId).name || companyName;
          }
        }

        return {
          id: document.id,
          ...appData,
          name: studentName,
          dept: studentDept,
          company: companyName,
          role: jobRole,
          date: new Date(appData.appliedAt).toLocaleDateString()
        };
      });
      
      setRecentApplications(resolvedApps);
    });

    // Fetch top recruiters (companies)
    const companiesQuery = query(collection(db, 'companies'));
    const unsubscribeCompanies = onSnapshot(companiesQuery, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hires: doc.data().totalHired || 0,
        package: doc.data().highestPackage || 'N/A',
        type: doc.data().industry || 'N/A'
      }));
      setCompanies(companiesData);
      setTopRecruiters(companiesData.sort((a, b) => b.hires - a.hires).slice(0, 5));
    });

    // Fetch all students for stats
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data()));
    });

    // Fetch all jobs for stats
    const jobsQuery = query(collection(db, 'jobs'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      setJobs(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubscribeApps();
      unsubscribeCompanies();
      unsubscribeStudents();
      unsubscribeJobs();
    };
  }, []);

  // Calculate placement data
  const deptStats: Record<string, { placed: number, unplaced: number }> = {};
  students.forEach(student => {
    const dept = student.dept || 'Other';
    if (!deptStats[dept]) deptStats[dept] = { placed: 0, unplaced: 0 };
    if (student.status === 'Placed') {
      deptStats[dept].placed++;
    } else {
      deptStats[dept].unplaced++;
    }
  });
  const placementData = Object.keys(deptStats).map(dept => ({
    name: dept,
    placed: deptStats[dept].placed,
    unplaced: deptStats[dept].unplaced
  }));

  // Calculate status data
  const statusCounts = {
    Placed: 0,
    Unplaced: 0,
    'Higher Studies': 0,
    'Entrepreneurship': 0
  };
  students.forEach(student => {
    if (student.status === 'Placed') statusCounts.Placed++;
    else if (student.status === 'Higher Studies') statusCounts['Higher Studies']++;
    else if (student.status === 'Entrepreneurship') statusCounts['Entrepreneurship']++;
    else statusCounts.Unplaced++;
  });
  
  const statusData = [
    { name: 'Placed', value: statusCounts.Placed, color: '#10b981' },
    { name: 'Unplaced', value: statusCounts.Unplaced, color: '#f43f5e' },
    { name: 'Higher Studies', value: statusCounts['Higher Studies'], color: '#3b82f6' },
    { name: 'Entrepreneurship', value: statusCounts['Entrepreneurship'], color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  const totalStudents = students.length;
  const placedStudents = statusCounts.Placed;
  const placementRate = totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 100) : 0;
  const activeJobsCount = jobs.filter(j => j.status === 'Active').length;

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Placement Overview</h2>
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md border border-red-200 uppercase tracking-wider">
              Role: Admin
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Here is the high-level metrics of the placement season.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Current Batch
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{totalStudents}</h3>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Students</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {placementRate}% Placement Rate
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{placedStudents}</h3>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Placed Students</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
              <Building className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Active Partners
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{companies.length}</h3>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Companies Visited</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              Currently Open
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{activeJobsCount}</h3>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Jobs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Department-wise Placements</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={placementData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="placed" name="Placed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={40} />
                <Bar dataKey="unplaced" name="Unplaced" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Overall Status</h3>
          <p className="text-sm text-slate-500 mb-6">Current breakdown of the batch</p>
          <div className="h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-auto">
            {statusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Recent Applications</h3>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company & Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No recent applications found.
                    </td>
                  </tr>
                ) : recentApplications.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.dept}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.company}</div>
                      <div className="text-xs text-slate-500">{row.role}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {row.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Top Recruiters</h3>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            {topRecruiters.length === 0 ? (
              <div className="text-center text-slate-500 py-4">No recruiters found.</div>
            ) : topRecruiters.map((company, i) => (
              <div key={i} className="flex items-start justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                    {company.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">{company.name}</h4>
                    <p className="text-xs text-slate-500">{company.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-sm">{company.hires} Hires</p>
                  <p className="text-xs text-emerald-600 font-medium">{company.package}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              View All Companies
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
