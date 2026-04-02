import { useState, useEffect } from 'react';
import { Briefcase, FileText, Clock, CheckCircle, Search, MapPin, DollarSign, Building, ExternalLink, Calendar, Star, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import FilterPanel, { ActiveFilters, FilterGroup } from '../../components/FilterPanel';
import { DetailedCardSkeleton } from '../../components/Skeletons';

const navItems = [
  { name: 'Dashboard', href: '/student', icon: Briefcase },
  { name: 'Browse Jobs', href: '/student/jobs', icon: Search },
  { name: 'My Applications', href: '/student/applications', icon: FileText },
  { name: 'Interviews', href: '/student/interviews', icon: Clock },
  { name: 'Profile', href: '/student/profile', icon: CheckCircle },
];

export default function StudentJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ type: [], location: [] });
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setStudentProfile(userDoc.data());
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };
    fetchProfile();

    // Listen to user's applications to see what they've already applied for
    const appsQuery = query(collection(db, 'applications'), where('studentId', '==', uid));
    const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach(doc => {
        // Assume withdrawn applications don't block reapplying, or maybe they do. We'll block active ones.
        if (doc.data().status !== 'Withdrawn') {
          ids.add(doc.data().jobId);
        }
      });
      setAppliedJobIds(ids);
    });

    // Listen to all active jobs
    const jobsQuery = query(collection(db, 'jobs'), where('status', '==', 'Active'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const activeJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(activeJobs);
      setLoading(false);
    });

    return () => {
      unsubscribeApps();
      unsubscribeJobs();
    };
  }, []);

  const handleApply = async (jobId: string) => {
    if (!user || !studentProfile) return;
    
    setError('');

    // Require resume validation
    if (!studentProfile.resumeUrl) {
      setError('You must add a Resume URL to your profile before applying to jobs.');
      setTimeout(() => navigate('/student/profile'), 3000);
      return;
    }

    setApplyingTo(jobId);
    try {
      await addDoc(collection(db, 'applications'), {
        jobId,
        studentId: user.uid,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        resumeUrl: studentProfile.resumeUrl // Snapshot the resume they had at the time of application
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setApplyingTo(null);
    }
  };

  // Extract unique locations
  const uniqueLocations = Array.from(new Set<string>(jobs.map((j: any) => String(j.location || '')).filter(l => l.length > 0)));

  // Build filter groups
  const filterGroups: FilterGroup[] = [
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm ||
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.requirements || []).some((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(job.type);
    const matchesLocation = activeFilters.location.length === 0 || activeFilters.location.includes(job.location);

    return matchesSearch && matchesType && matchesLocation;
  });

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Browse Open Jobs</h2>
          <p className="text-slate-500 text-sm mt-1">Discover and apply to active placement opportunities.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 font-medium rounded-xl border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by role, company, or skills..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-none focus:ring-0 outline-none"
          />
        </div>
        <FilterPanel
          groups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          resultCount={filteredJobs.length}
          totalCount={jobs.length}
        />
      </div>

      {loading ? (
        <DetailedCardSkeleton count={6} />
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No jobs found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            const isApplying = applyingTo === job.id;

            return (
              <div key={job.id} className="bg-white flex flex-col p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-xl border border-indigo-100">
                    {job.companyName?.charAt(0) || 'C'}
                  </div>
                  {job.type && (
                    <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                      {job.type}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{job.title}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1 mb-4">
                  <Building className="w-4 h-4" />
                  {job.companyName || 'Unknown Company'}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {job.location || 'Not Specified'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    {job.salaryRange || 'Not Disclosed'}
                  </div>
                  {job.deadline && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                      <Calendar className="w-4 h-4" />
                      Apply by: {job.deadline}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                  {(job.requirements || []).slice(0, 3).map((req: string) => (
                    <span key={req} className="text-xs font-semibold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                      {req}
                    </span>
                  ))}
                  {(job.requirements || []).length > 3 && (
                    <span className="text-xs font-semibold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                      +{(job.requirements.length - 3)} more
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-auto">
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={hasApplied || isApplying}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors ${
                      hasApplied 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50'
                    }`}
                  >
                    {isApplying ? 'Applying...' : hasApplied ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Applied
                      </>
                    ) : (
                      <>
                        Apply Now <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
