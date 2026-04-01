import { Briefcase, Users, Clock, Calendar, Video, MapPin, Plus, Search, Filter, MessageSquare, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const navItems = [
  { name: 'Dashboard', href: '/recruiter', icon: Briefcase },
  { name: 'Job Postings', href: '/recruiter/jobs', icon: Briefcase },
  { name: 'Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'Interviews', href: '/recruiter/interviews', icon: Clock },
];

export default function RecruiterInterviews() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'interviews'), where('recruiterId', '==', auth.currentUser.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const interviewsData = await Promise.all(snapshot.docs.map(async (interviewDoc) => {
          const data = interviewDoc.data();
          
          // Fetch student details
          let candidateName = 'Unknown Candidate';
          if (data.studentId) {
            try {
              const studentDoc = await getDoc(doc(db, 'users', data.studentId));
              if (studentDoc.exists()) {
                candidateName = studentDoc.data().name || studentDoc.data().displayName;
              }
            } catch (e) {
              console.error("Error fetching student:", e);
            }
          }

          // Fetch job details
          let role = 'Unknown Role';
          if (data.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
              if (jobDoc.exists()) {
                role = jobDoc.data().title;
              }
            } catch (e) {
              console.error("Error fetching job:", e);
            }
          }

          return {
            id: interviewDoc.id,
            candidate: candidateName,
            role: role,
            date: new Date(data.scheduledAt).toLocaleDateString(),
            time: new Date(data.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: data.type || 'Technical Round',
            mode: data.mode || 'Virtual',
            link: data.meetingLink || 'meet.google.com/xyz',
            location: data.location,
            status: data.status || 'Pending',
            feedback: data.feedback ? 'Submitted' : 'Pending',
            interviewer: data.interviewerName || 'Recruiter'
          };
        }));
        
        setInterviews(interviewsData);
      } catch (error) {
        console.error("Error processing interviews:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching interviews:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredInterviews = interviews.filter(interview => 
    interview.candidate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.interviewer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInterviews = filteredInterviews.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <DashboardLayout role="Recruiter" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Schedule</h2>
          <p className="text-slate-500 text-sm mt-1">Manage upcoming interviews, send reminders, and submit feedback.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Schedule Interview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Interviews', count: interviews.length, color: 'indigo' },
          { label: 'Upcoming', count: interviews.filter(i => i.status === 'Scheduled' || i.status === 'Confirmed').length, color: 'blue' },
          { label: 'Pending Feedback', count: interviews.filter(i => i.status === 'Completed' && i.feedback === 'Pending').length, color: 'amber' },
          { label: 'Completed', count: interviews.filter(i => i.status === 'Completed').length, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4 flex items-center justify-between`}>
            <div>
              <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>{stat.label}</p>
              <h4 className={`text-2xl font-bold text-${stat.color}-900`}>{stat.count}</h4>
            </div>
            <div className={`p-3 bg-white rounded-lg shadow-sm text-${stat.color}-500`}>
              <Clock className="w-5 h-5" />
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
              placeholder="Search by candidate, role, or interviewer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full shadow-sm transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredInterviews.length)} of {filteredInterviews.length} interviews</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate & Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule & Mode</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interviewer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Feedback</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading interviews...</td>
                </tr>
              ) : currentInterviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No interviews found.</td>
                </tr>
              ) : (
                currentInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200 shrink-0">
                          {interview.candidate.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{interview.candidate}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">{interview.role}</div>
                          <div className="text-xs text-slate-400 mt-1">{interview.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          {interview.date}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {interview.time}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                          {interview.mode === 'Virtual' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                          {interview.mode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 shrink-0">
                          {interview.interviewer.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{interview.interviewer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        {interview.status === 'Confirmed' || interview.status === 'Scheduled' ? (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <CheckCircle className="w-3.5 h-3.5" /> {interview.status}
                          </span>
                        ) : interview.status === 'Completed' ? (
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <AlertCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        
                        {interview.feedback === 'Submitted' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <MessageSquare className="w-3.5 h-3.5" /> Feedback Submitted
                          </span>
                        ) : interview.status === 'Completed' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                            <MessageSquare className="w-3.5 h-3.5" /> Feedback Pending
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {interview.status !== 'Completed' && (
                          <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                            {interview.mode === 'Virtual' ? 'Join' : 'Details'}
                          </button>
                        )}
                        {interview.status === 'Completed' && interview.feedback === 'Pending' && (
                          <button className="text-amber-600 hover:text-amber-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                            Add Feedback
                          </button>
                        )}
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
