import { Briefcase, FileText, Users, Calendar, Search, Filter, MoreHorizontal, Plus, Building, MapPin, DollarSign, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import RecruiterPostJobModal from '../../components/recruiter/RecruiterPostJobModal';
import FilterPanel, { ActiveFilters, FilterGroup } from '../../components/FilterPanel';
import { useSearchParams } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', href: '/recruiter', icon: Briefcase },
  { name: 'Job Postings', href: '/recruiter/jobs', icon: FileText },
  { name: 'Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'Interviews', href: '/recruiter/interviews', icon: Calendar },
];

export default function RecruiterJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ status: [], type: [] });
  const [sortField, setSortField] = useState<'title' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open modal when navigated with ?action=post (from dashboard button)
  useEffect(() => {
    if (searchParams.get('action') === 'post') {
      setIsAddModalOpen(true);
      // Clean up the URL so refreshing doesn't re-open
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'jobs'), where('recruiterId', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const jobsPromises = snapshot.docs.map(async (document) => {
        const jobData = document.data();
        let applicantsCount = 0;

        try {
          const appsQuery = query(collection(db, 'applications'), where('jobId', '==', document.id));
          const appsSnapshot = await getDocs(appsQuery);
          applicantsCount = appsSnapshot.size;
        } catch (error) {
          console.error("Error fetching applicants count:", error);
        }

        return {
          id: document.id,
          ...jobData,
          date: new Date(jobData.createdAt || Date.now()).toLocaleDateString(),
          status: jobData.status || 'Active',
          applicants: applicantsCount
        };
      });

      const resolvedJobs = await Promise.all(jobsPromises);
      setJobs(resolvedJobs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Build filter groups
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
  ];

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = !searchTerm ||
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(job.status);
      const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(job.type);

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortField === 'date') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <DashboardLayout role="Recruiter" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Job Postings</h2>
          <p className="text-slate-500 text-sm">Manage your active and closed job postings.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Post New Job
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search jobs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full sm:w-64"
              />
            </div>
            <FilterPanel
              groups={filterGroups}
              activeFilters={activeFilters}
              onFilterChange={(f) => { setActiveFilters(f); setCurrentPage(1); }}
              resultCount={filteredJobs.length}
              totalCount={jobs.length}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredJobs.length)} of {filteredJobs.length} jobs</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">
                  <button onClick={() => { setSortField('title'); setSortDir(d => sortField === 'title' ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    Job Title <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">
                  <button onClick={() => { setSortField('date'); setSortDir(d => sortField === 'date' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    Posted Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">Applicants</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading jobs...</td>
                </tr>
              ) : currentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No jobs found.</td>
                </tr>
              ) : (
                currentJobs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.title}</td>
                    <td className="px-6 py-4">{row.department || 'Engineering'}</td>
                    <td className="px-6 py-4">{row.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{row.applicants}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="group/menu relative inline-block text-left">
                        <button className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors focus:outline-none">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        <div className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                          <div className="py-1">
                            <button
                              onClick={() => toggleStatus(row.id, row.status)}
                              className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-slate-50"
                            >
                              Mark {row.status === 'Active' ? 'Closed' : 'Active'}
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-red-50 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <button 
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    currentPage === number 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
            <button 
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <RecruiterPostJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
