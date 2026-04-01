import { Briefcase, FileText, CheckCircle, Clock, Calendar, Video, MapPin, ExternalLink, MessageSquare, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const navItems = [
  { name: 'Dashboard', href: '/student', icon: Briefcase },
  { name: 'My Applications', href: '/student/applications', icon: FileText },
  { name: 'Interviews', href: '/student/interviews', icon: Clock },
  { name: 'Profile', href: '/student/profile', icon: CheckCircle },
];

export default function StudentInterviews() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'interviews'), where('studentId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const interviewsData = await Promise.all(snapshot.docs.map(async (interviewDoc) => {
          const data = interviewDoc.data();
          
          let companyName = 'Unknown Company';
          let roleTitle = 'Unknown Role';
          
          if (data.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
              if (jobDoc.exists()) {
                roleTitle = jobDoc.data().title;
                companyName = jobDoc.data().company || 'Unknown Company';
              }
            } catch (e) {
              console.error("Error fetching job:", e);
            }
          }

          return {
            id: interviewDoc.id,
            ...data,
            company: companyName,
            role: roleTitle,
            date: new Date(data.scheduledAt).toLocaleDateString(),
            time: new Date(data.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: data.round || data.type || 'Interview',
            mode: data.mode || 'Virtual',
            link: data.meetingLink || '',
            location: data.location || '',
            interviewer: { name: data.interviewerName || 'Interviewer', role: 'Technical Panel' },
            status: data.status || 'Scheduled',
            feedback: data.feedback || 'Pending'
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

  const upcomingInterviews = interviews.filter(i => i.status === 'Scheduled' || i.status === 'Confirmed' || i.status === 'Action Required');
  const pastInterviews = interviews.filter(i => i.status === 'Completed' || i.status === 'Cancelled');

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPastInterviews = pastInterviews.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(pastInterviews.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Interviews Schedule</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your upcoming interviews and review past feedback.</p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Upcoming Interviews
            </h3>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              {upcomingInterviews.length} Scheduled
            </span>
          </div>
          
          <div className="grid gap-4">
            {loading ? (
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">Loading interviews...</div>
            ) : upcomingInterviews.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">No upcoming interviews scheduled.</div>
            ) : (
              upcomingInterviews.map((interview) => (
                <div key={interview.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{interview.company}</h4>
                          <p className="text-slate-600 font-medium">{interview.role} • {interview.type}</p>
                        </div>
                        {interview.status === 'Action Required' ? (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Confirm Attendance
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {interview.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <Calendar className="w-5 h-5 text-indigo-500" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date & Time</p>
                            <p className="font-medium text-slate-900">{interview.date}</p>
                            <p className="text-sm">{interview.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {interview.mode === 'Virtual' ? <Video className="w-5 h-5 text-indigo-500" /> : <MapPin className="w-5 h-5 text-indigo-500" />}
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location / Link</p>
                            <p className="font-medium text-slate-900">{interview.mode}</p>
                            {interview.link ? (
                              <a href={interview.link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                Join Meeting <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <p className="text-sm truncate max-w-[200px]" title={interview.location}>{interview.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-64 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                      <div className="mb-4">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Interviewer</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-200">
                            {interview.interviewer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{interview.interviewer.name}</p>
                            <p className="text-xs text-slate-500">{interview.interviewer.role}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {interview.mode === 'Virtual' && interview.link && (
                          <a href={interview.link} target="_blank" rel="noopener noreferrer" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2">
                            <Video className="w-4 h-4" />
                            Join
                          </a>
                        )}
                        <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm text-center">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Past Interviews
            </h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading past interviews...</div>
            ) : currentPastInterviews.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No past interviews found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company & Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPastInterviews.map((interview) => (
                      <tr key={interview.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{interview.company}</div>
                          <div className="text-sm text-slate-500">{interview.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-700">{interview.date}</div>
                          <div className="text-sm text-slate-500">{interview.type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {interview.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{interview.feedback}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="text-sm text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, pastInterviews.length)}</span> of <span className="font-bold text-slate-900">{pastInterviews.length}</span> past interviews
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent bg-white shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors shadow-sm ${
                          currentPage === number 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent bg-white shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
