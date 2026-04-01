import { Briefcase, FileText, Search, Filter, Plus, MoreVertical, MapPin, DollarSign, Users, Calendar, TrendingUp, Building, FileBarChart } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: TrendingUp },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Full-time': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Internship': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'jobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeJobsCount = jobs.filter(j => j.status === 'Active').length;
  const totalApplications = jobs.reduce((sum, job) => sum + (job.applicants || 0), 0);
  const closingSoonCount = jobs.filter(j => {
    if (!j.deadline) return false;
    const deadlineDate = new Date(j.deadline);
    const today = new Date();
    const diffTime = Math.abs(deadlineDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7 && j.status === 'Active';
  }).length;

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Job Postings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage active job opportunities, track applications, and view deadlines.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Post New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Postings', count: jobs.length, color: 'blue' },
          { label: 'Active Jobs', count: activeJobsCount, color: 'emerald' },
          { label: 'Total Applications', count: totalApplications, color: 'indigo' },
          { label: 'Closing Soon', count: closingSoonCount, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4 flex items-center justify-between`}>
            <div>
              <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>{stat.label}</p>
              <h4 className={`text-2xl font-bold text-${stat.color}-900`}>{stat.count}</h4>
            </div>
            <div className={`p-3 bg-white rounded-lg shadow-sm text-${stat.color}-500`}>
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search roles, companies, or locations..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full shadow-sm transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {paginatedJobs.length} of {filteredJobs.length} jobs</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Loading jobs...</div>
          ) : paginatedJobs.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No jobs found.</div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requirements</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Metrics</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg border border-slate-200 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                        {job.companyName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{job.title}</div>
                        <div className="text-xs text-slate-500 font-medium mb-1">{job.companyName}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salaryRange}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getTypeColor(job.type)}`}>
                        {job.type}
                      </span>
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {(job.eligibleBranches || []).map((branch: string) => (
                          <span key={branch} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {branch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500"><Users className="w-4 h-4 inline mr-1" /> Applicants:</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{job.applicants || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-slate-500"><Calendar className="w-4 h-4 inline mr-1" /> Deadline:</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {job.status === 'Active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
                        Closed
                      </span>
                    )}
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
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
