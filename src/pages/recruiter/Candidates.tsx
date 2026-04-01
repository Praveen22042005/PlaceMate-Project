import { Briefcase, Users, Clock, Search, Filter, MoreVertical, MapPin, Download, CheckCircle, XCircle, Star, Mail, Phone, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

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
    case 'Applied': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-amber-500';
  return 'text-red-500';
};

export default function RecruiterCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (!auth.currentUser) return;

    // First, fetch jobs for this recruiter
    const jobsQuery = query(collection(db, 'jobs'), where('recruiterId', '==', auth.currentUser.uid));
    
    const unsubscribeJobs = onSnapshot(jobsQuery, (jobsSnapshot) => {
      const jobIds = jobsSnapshot.docs.map(doc => doc.id);
      
      if (jobIds.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      // Then, fetch applications for these jobs
      // Note: Firestore 'in' queries are limited to 10 items. For a real app with many jobs,
      // you'd need a different approach, but this works for our seeded data.
      const chunks = [];
      for (let i = 0; i < jobIds.length; i += 10) {
        chunks.push(jobIds.slice(i, i + 10));
      }

      const unsubscribes: any[] = [];
      let allCandidates: any[] = [];

      chunks.forEach(chunk => {
        const appsQuery = query(collection(db, 'applications'), where('jobId', 'in', chunk));
        const unsub = onSnapshot(appsQuery, async (appsSnapshot) => {
          const candidatesPromises = appsSnapshot.docs.map(async (appDoc) => {
            const appData = appDoc.data();
            let studentData: any = {};
            let jobData: any = {};

            try {
              if (appData.studentId) {
                const studentDocRef = await getDoc(doc(db, 'users', appData.studentId));
                if (studentDocRef.exists()) {
                  studentData = studentDocRef.data();
                }
              }
              if (appData.jobId) {
                const jobDocRef = await getDoc(doc(db, 'jobs', appData.jobId));
                if (jobDocRef.exists()) {
                  jobData = jobDocRef.data();
                }
              }
            } catch (error) {
              console.error("Error fetching related data:", error);
            }

            return {
              id: appDoc.id,
              name: studentData.displayName || 'Unknown Student',
              email: studentData.email || 'No email',
              role: jobData.title || 'Unknown Role',
              experience: studentData.experience?.length > 0 ? `${studentData.experience.length} Exp` : 'Fresher',
              education: studentData.education?.[0]?.degree || studentData.dept || 'B.Tech',
              matchScore: appData.matchScore || 85, // Use real match score if available, else default
              status: appData.status || 'Applied',
              skills: studentData.skills?.slice(0, 3) || ['React', 'JavaScript', 'HTML'],
              appliedDate: new Date(appData.appliedAt || Date.now()).toLocaleDateString(),
              phone: studentData.phone || '+91 0000000000',
              resumeUrl: appData.resumeUrl
            };
          });

          const resolvedCandidates = await Promise.all(candidatesPromises);
          
          // Merge with existing candidates from other chunks
          allCandidates = [...allCandidates.filter(c => !resolvedCandidates.find(rc => rc.id === c.id)), ...resolvedCandidates];
          setCandidates(allCandidates);
          setLoading(false);
        });
        unsubscribes.push(unsub);
      });

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    });

    return () => unsubscribeJobs();
  }, []);

  const filteredCandidates = candidates.filter(candidate => 
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.skills.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <DashboardLayout role="Recruiter" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Pipeline</h2>
          <p className="text-slate-500 text-sm mt-1">Review applications, track candidate progress, and manage hiring stages.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Candidates', count: candidates.length, color: 'blue' },
          { label: 'In Review', count: candidates.filter(c => c.status === 'Assessment' || c.status === 'reviewing').length, color: 'amber' },
          { label: 'Interviews Scheduled', count: candidates.filter(c => c.status === 'Interview' || c.status === 'interviewing').length, color: 'indigo' },
          { label: 'Offers Extended', count: candidates.filter(c => c.status === 'Offered').length, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4 flex items-center justify-between`}>
            <div>
              <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>{stat.label}</p>
              <h4 className={`text-2xl font-bold text-${stat.color}-900`}>{stat.count}</h4>
            </div>
            <div className={`p-3 bg-white rounded-lg shadow-sm text-${stat.color}-500`}>
              <Users className="w-5 h-5" />
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
                        <div className="flex items-center gap-2">
                          <Star className={`w-4 h-4 fill-current ${getScoreColor(candidate.matchScore)}`} />
                          <span className={`font-bold text-sm ${getScoreColor(candidate.matchScore)}`}>{candidate.matchScore}% Match</span>
                        </div>
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
                      <div className="flex items-center justify-end gap-2">
                        {candidate.resumeUrl && (
                          <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                            View Resume
                          </a>
                        )}
                        <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
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
