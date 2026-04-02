import { Briefcase, FileText, Search, Filter, Plus, MoreVertical, MapPin, DollarSign, Users, Calendar, TrendingUp, Building, FileBarChart, ArrowUpDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AddJobModal from '../../components/admin/AddJobModal';
import FilterPanel, { ActiveFilters, FilterGroup } from '../../components/FilterPanel';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { TableSkeleton } from '../../components/Skeletons';

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
  const { data: jobs, loading } = useFirestoreCollection('jobs');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'title' | 'createdAt' | 'applicants'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ status: [], type: [], location: [] });
  const itemsPerPage = 10;

  // Extract unique locations for the filter dropdown
  const uniqueLocations = Array.from(new Set<string>(jobs.map((j: any) => String(j.location || '')).filter(l => l.length > 0)));

  // Build filter groups with live counts
  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Active', label: 'Active', count: jobs.filter(j => j.status === 'Active').length },
        { value: 'Closed', label: 'Closed', count: jobs.filter(j => j.status === 'Closed').length },
      ],
    },
    {
      id: 'type',
      label: 'Job Type',
      options: [
        { value: 'Full-time', label: 'Full-time', count: jobs.filter(j => j.type === 'Full-time').length },
        { value: 'Part-time', label: 'Part-time', count: jobs.filter(j => j.type === 'Part-time').length },
        { value: 'Internship', label: 'Internship', count: jobs.filter(j => j.type === 'Internship').length },
        { value: 'Contract', label: 'Contract', count: jobs.filter(j => j.type === 'Contract').length },
      ].filter(o => o.count > 0),
    },
    {
      id: 'location',
      label: 'Location',
      options: uniqueLocations.map(loc => ({
        value: loc,
        label: loc,
        count: jobs.filter(j => j.location === loc).length,
      })),
    },
  ];

  const filteredJobs = jobs
    .filter(job => {
      // Text search
      const matchesSearch = !searchTerm ||
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(job.status);

      // Type filter
      const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(job.type);

      // Location filter
      const matchesLocation = activeFilters.location.length === 0 || activeFilters.location.includes(job.location);

      return matchesSearch && matchesStatus && matchesType && matchesLocation;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortField === 'createdAt') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      else if (sortField === 'applicants') cmp = (a.applicants || 0) - (b.applicants || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

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

  const toggleStatus = async (jobId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Closed' : 'Active';
      await updateDoc(doc(db, 'jobs', jobId), { status: newStatus });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'jobs', jobId));
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Job Postings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage active job opportunities, track applications, and view deadlines.</p>
        </div>
        <div className="flex gap-3">
          <FilterPanel
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(f) => { setActiveFilters(f); setCurrentPage(1); }}
            resultCount={filteredJobs.length}
            totalCount={jobs.length}
          />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Total Postings</p>
            <h4 className="text-2xl font-bold text-blue-900">{jobs.length}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-blue-500">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">Active Jobs</p>
            <h4 className="text-2xl font-bold text-emerald-900">{activeJobsCount}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-emerald-500">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600 mb-1">Total Applications</p>
            <h4 className="text-2xl font-bold text-indigo-900">{totalApplications}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-500">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600 mb-1">Closing Soon</p>
            <h4 className="text-2xl font-bold text-amber-900">{closingSoonCount}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-amber-500">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
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
             <TableSkeleton rows={5} />
          ) : paginatedJobs.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No jobs found.</div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <button onClick={() => { setSortField('title'); setSortDir(d => sortField === 'title' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    Job Details <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requirements</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <button onClick={() => { setSortField('applicants'); setSortDir(d => sortField === 'applicants' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    Metrics <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
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
                  <td className="px-6 py-4 text-right relative">
                    <div className="group/menu relative inline-block text-left">
                      <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors focus:outline-none">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                        <div className="py-1">
                          <button
                            onClick={() => toggleStatus(job.id, job.status)}
                            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-slate-50"
                          >
                            Mark {job.status === 'Active' ? 'Closed' : 'Active'}
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-red-50 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
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

      <AddJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
