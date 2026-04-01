import { Briefcase, FileText, CheckCircle, Clock, Search, Filter, Building, MapPin, DollarSign, Calendar, ArrowRight, ChevronRight, XCircle, ChevronLeft } from 'lucide-react';
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Offered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'interviewing':
    case 'Interview': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Assessment': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'reviewing':
    case 'Applied': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getProgressBarColor = (status: string) => {
  switch (status) {
    case 'Offered': return 'bg-emerald-500';
    case 'Rejected': return 'bg-red-500';
    case 'interviewing':
    case 'Interview': return 'bg-indigo-500';
    case 'Assessment': return 'bg-amber-500';
    case 'reviewing':
    case 'Applied': return 'bg-blue-500';
    default: return 'bg-slate-500';
  }
};

const getProgressValue = (status: string) => {
  switch (status) {
    case 'Applied':
    case 'reviewing': return 25;
    case 'Assessment': return 50;
    case 'Interview':
    case 'interviewing': return 75;
    case 'Offered':
    case 'Rejected': return 100;
    default: return 0;
  }
};

export default function StudentApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'applications'), where('studentId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const appsData = await Promise.all(snapshot.docs.map(async (appDoc) => {
          const data = appDoc.data();
          
          let roleTitle = 'Unknown Role';
          let companyName = 'Unknown Company';
          let location = 'Remote';
          let type = 'Full-time';
          let salary = 'Not specified';
          
          if (data.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
              if (jobDoc.exists()) {
                const jobData = jobDoc.data();
                roleTitle = jobData.title || roleTitle;
                companyName = jobData.company || companyName;
                location = jobData.location || location;
                type = jobData.type || type;
                salary = jobData.salary || salary;
              }
            } catch (e) {
              console.error("Error fetching job:", e);
            }
          }

          return {
            id: appDoc.id,
            ...data,
            role: roleTitle,
            company: companyName,
            location: location,
            type: type,
            salary: salary,
            appliedDate: new Date(data.appliedAt).toLocaleDateString(),
            progress: getProgressValue(data.status),
            nextStep: data.status === 'reviewing' || data.status === 'Applied' ? 'Application Under Review' : 
                      data.status === 'interviewing' || data.status === 'Interview' ? 'Technical Round' :
                      data.status === 'Offered' ? 'Offer Letter Sent' :
                      data.status === 'Rejected' ? 'Position Filled' : 'Pending'
          };
        }));
        
        setApplications(appsData);
      } catch (error) {
        console.error("Error processing applications:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching applications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredApps = applications.filter(app => 
    app.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentApps = filteredApps.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalApplied = applications.length;
  const inProgress = applications.filter(a => a.status === 'reviewing' || a.status === 'Applied' || a.status === 'Assessment').length;
  const interviews = applications.filter(a => a.status === 'interviewing' || a.status === 'Interview').length;
  const offers = applications.filter(a => a.status === 'Offered').length;

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Applications</h2>
          <p className="text-slate-500 text-sm mt-1">Track and manage your job applications across companies.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search roles, companies..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64 shadow-sm transition-shadow"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applied', count: totalApplied, color: 'blue' },
          { label: 'In Progress', count: inProgress, color: 'amber' },
          { label: 'Interviews', count: interviews, color: 'indigo' },
          { label: 'Offers Received', count: offers, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4 flex items-center justify-between`}>
            <div>
              <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>{stat.label}</p>
              <h4 className={`text-2xl font-bold text-${stat.color}-900`}>{stat.count}</h4>
            </div>
            <div className={`p-3 bg-white rounded-lg shadow-sm text-${stat.color}-500`}>
              <FileText className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading applications...</div>
        ) : currentApps.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No applications found.</div>
        ) : (
          currentApps.map((app) => (
            <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{app.role}</h3>
                      <div className="flex items-center gap-2 text-slate-600 font-medium mt-1">
                        <Building className="w-4 h-4 text-slate-400" />
                        {app.company}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusColor(app.status)}`}>
                      {app.status === 'reviewing' ? 'Applied' : app.status === 'interviewing' ? 'Interview' : app.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-4">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {app.location}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      {app.type}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      {app.salary}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Applied: {app.appliedDate}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-1/3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Application Progress</span>
                    <span>{app.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-1000 ${getProgressBarColor(app.status)}`} style={{ width: `${app.progress}%` }}></div>
                  </div>
                  <div className="flex items-start gap-2">
                    {app.status === 'Rejected' ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : app.status === 'Offered' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium text-slate-700 leading-tight">
                      {app.nextStep}
                    </p>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 shrink-0">
                  <button className="flex-1 lg:flex-none bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center">
                    View Details
                  </button>
                  {app.status !== 'Rejected' && app.status !== 'Offered' && (
                    <button className="flex-1 lg:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center">
                      Withdraw
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
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
    </DashboardLayout>
  );
}
