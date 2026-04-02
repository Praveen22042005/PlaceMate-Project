import { Briefcase, Users, Clock, Search, Filter, MoreVertical, MapPin, Download, CheckCircle, XCircle, Mail, Phone, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, documentId, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import FilterPanel, { ActiveFilters, FilterGroup } from '../../components/FilterPanel';
import AICandidateScore from '../../components/AICandidateScore';
import { addNotification } from '../../services/notifications';

const navItems = [
  { name: 'Dashboard', href: '/recruiter', icon: Briefcase },
  { name: 'Job Postings', href: '/recruiter/jobs', icon: Briefcase },
  { name: 'Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'Interviews', href: '/recruiter/interviews', icon: Clock },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Offered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Interview': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Assessment': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Under Review': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'Applied': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
    case 'Withdrawn': return 'bg-slate-100 text-slate-500 border-slate-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-amber-500';
  return 'text-red-500';
};

export default function RecruiterCandidates() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ status: [] });

  // Track inner unsubscribes to prevent memory leak
  const innerUnsubs = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!user) return;

    // Clean up inner listeners on every outer re-fire
    const cleanupInner = () => {
      innerUnsubs.current.forEach(unsub => unsub());
      innerUnsubs.current = [];
    };

    // First, fetch jobs for this recruiter
    const jobsQuery = query(collection(db, 'jobs'), where('recruiterId', '==', user.uid));
    
    const unsubscribeJobs = onSnapshot(jobsQuery, (jobsSnapshot) => {
      // Clean up previous inner listeners before setting up new ones
      cleanupInner();

      const jobIds = jobsSnapshot.docs.map(doc => doc.id);
      
      const jobsMap = new Map();
      jobsSnapshot.docs.forEach(doc => {
        jobsMap.set(doc.id, doc.data());
      });

      if (jobIds.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      // Firestore 'in' queries are limited to 10 items, chunk them
      const chunks = [];
      for (let i = 0; i < jobIds.length; i += 10) {
        chunks.push(jobIds.slice(i, i + 10));
      }

      let allCandidates: any[] = [];

      chunks.forEach(chunk => {
        const appsQuery = query(collection(db, 'applications'), where('jobId', 'in', chunk));
        const unsub = onSnapshot(appsQuery, async (appsSnapshot) => {
          
          const studentIds = Array.from(new Set(appsSnapshot.docs.map(d => d.data().studentId).filter(Boolean))) as string[];
          const studentsMap = new Map();

          if (studentIds.length > 0) {
            const studentChunks = [];
            for (let i = 0; i < studentIds.length; i += 10) {
              studentChunks.push(studentIds.slice(i, i + 10));
            }
            
            try {
              await Promise.all(studentChunks.map(async (sChunk) => {
                const q = query(collection(db, 'users'), where(documentId(), 'in', sChunk));
                const qs = await getDocs(q);
                qs.forEach(doc => studentsMap.set(doc.id, doc.data()));
              }));
            } catch (error) {
              console.error("Error batch fetching students:", error);
            }
          }

          const resolvedCandidates = appsSnapshot.docs.map(appDoc => {
            const appData = appDoc.data();
            const studentData = studentsMap.get(appData.studentId) || {};
            const jobData = jobsMap.get(appData.jobId) || {};

            return {
              id: appDoc.id,
              name: studentData.displayName || 'Unknown Student',
              email: studentData.email || 'No email',
              role: jobData.title || 'Unknown Role',
              experience: studentData.experience?.length > 0 ? `${studentData.experience.length} Exp` : 'Fresher',
              education: studentData.education?.[0]?.degree || studentData.dept || 'B.Tech',
              matchScore: appData.matchScore || 85,
              status: appData.status || 'Applied',
              skills: studentData.skills?.slice(0, 3) || [],
              appliedDate: new Date(appData.appliedAt || Date.now()).toLocaleDateString(),
              phone: studentData.phone || '',
              resumeUrl: appData.resumeUrl,
              studentId: appData.studentId
            };
          });

          // Merge with existing candidates from other chunks
          allCandidates = [...allCandidates.filter(c => !resolvedCandidates.find(rc => rc.id === c.id)), ...resolvedCandidates];
          setCandidates(allCandidates);
          setLoading(false);
        });
        innerUnsubs.current.push(unsub);
      });
    });

    return () => {
      cleanupInner();
      unsubscribeJobs();
    };
  }, []);

  // Build filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Application Status',
      options: [
        { value: 'Applied', label: 'Applied', count: candidates.filter(c => c.status === 'Applied').length },
        { value: 'Under Review', label: 'Under Review', count: candidates.filter(c => c.status === 'Under Review').length },
        { value: 'Assessment', label: 'Assessment', count: candidates.filter(c => c.status === 'Assessment').length },
        { value: 'Interview', label: 'Interview', count: candidates.filter(c => c.status === 'Interview').length },
        { value: 'Offered', label: 'Offered', count: candidates.filter(c => c.status === 'Offered').length },
        { value: 'Rejected', label: 'Rejected', count: candidates.filter(c => c.status === 'Rejected').length },
        { value: 'Withdrawn', label: 'Withdrawn', count: candidates.filter(c => c.status === 'Withdrawn').length },
      ].filter(o => o.count > 0),
    },
  ];

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = !searchTerm ||
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(candidate.status);

    return matchesSearch && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const updateCandidateStatus = async (applicationId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'applications', applicationId), { status: newStatus });
      
      const candidate = candidates.find(c => c.id === applicationId);
      if (candidate && candidate.studentId) {
        await addNotification({
          userId: candidate.studentId,
          title: 'Application Status Updated',
          message: `Your application for ${candidate.role} is now marked as ${newStatus}.`,
          type: 'application_status',
          link: '/student/applications'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <DashboardLayout role="Recruiter" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Pipeline</h2>
          <p className="text-slate-500 text-sm mt-1">Review applications, track candidate progress, and manage hiring stages.</p>
        </div>
        <div className="flex gap-3">
          <FilterPanel
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(f) => { setActiveFilters(f); setCurrentPage(1); }}
            resultCount={filteredCandidates.length}
            totalCount={candidates.length}
          />
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Total Candidates</p>
            <h4 className="text-2xl font-bold text-blue-900">{candidates.length}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-blue-500">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600 mb-1">In Review</p>
            <h4 className="text-2xl font-bold text-amber-900">{candidates.filter(c => c.status === 'Under Review' || c.status === 'Assessment').length}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-amber-500">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600 mb-1">Interviews Scheduled</p>
            <h4 className="text-2xl font-bold text-indigo-900">{candidates.filter(c => c.status === 'Interview').length}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-500">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">Offers Extended</p>
            <h4 className="text-2xl font-bold text-emerald-900">{candidates.filter(c => c.status === 'Offered').length}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-emerald-500">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search candidates by name, role, or skills..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full shadow-sm transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCandidates.length)} of {filteredCandidates.length} candidates</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Profile</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Skills & Match</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading candidates...</td>
                </tr>
              ) : currentCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No candidates found.</td>
                </tr>
              ) : (
                currentCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200 shrink-0">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{candidate.name}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                            <GraduationCap className="w-3 h-3" />
                            <span className="truncate max-w-[120px]" title={candidate.education}>{candidate.education}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[120px]" title={candidate.email}>{candidate.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{candidate.role}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                        <Briefcase className="w-3 h-3" />
                        {candidate.experience}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Applied: {candidate.appliedDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <AICandidateScore
                          candidateName={candidate.name}
                          candidateSkills={candidate.skills}
                          jobTitle={candidate.role}
                        />
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {candidate.skills.map((skill: string) => (
                            <span key={skill} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {candidate.resumeUrl && (
                          <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                            View Resume
                          </a>
                        )}
                        <div className="group/menu relative inline-block text-left">
                          <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors focus:outline-none">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 overflow-hidden">
                            <div className="py-1 bg-slate-50 border-b border-slate-100 px-3">
                              <span className="text-xs font-bold text-slate-500 uppercase">Change Status</span>
                            </div>
                            <div className="py-1">
                              {['Under Review', 'Assessment', 'Interview', 'Offered', 'Rejected'].map((statusOption) => (
                                <button
                                  key={statusOption}
                                  onClick={() => updateCandidateStatus(candidate.id, statusOption)}
                                  className={`block px-4 py-2 text-sm w-full text-left font-medium transition-colors ${
                                    candidate.status === statusOption 
                                      ? 'bg-indigo-50 text-indigo-700' 
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  Mark as {statusOption}
                                </button>
                              ))}
                            </div>
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
    </DashboardLayout>
  );
}
