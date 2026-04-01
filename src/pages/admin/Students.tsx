import { Users, Building, Briefcase, FileBarChart, Search, Filter, Plus, MoreVertical, CheckCircle, XCircle, Mail, Phone, GraduationCap, Award, Clock } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: Briefcase },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
];

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching students:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = students.filter(student => 
    student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.dept?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalStudents = students.length;
  const placedStudents = students.filter(s => s.status === 'Placed').length;
  const unplacedStudents = students.filter(s => s.status === 'Unplaced').length;
  const multipleOffers = students.filter(s => (s.offers || 0) > 1).length;

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage student profiles, track placement status, and view details.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Students', count: totalStudents, color: 'blue' },
          { label: 'Placed', count: placedStudents, color: 'emerald' },
          { label: 'Unplaced', count: unplacedStudents, color: 'amber' },
          { label: 'Multiple Offers', count: multipleOffers, color: 'purple' },
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
              placeholder="Search by name, roll no, or department..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full shadow-sm transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {paginatedStudents.length} of {filteredStudents.length} students</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Skills</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Offers</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading students...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              ) : paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200 shrink-0">
                        {student.displayName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{student.displayName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-medium">{student.rollNo || 'N/A'}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[120px]" title={student.email}>{student.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium mb-1">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      {student.dept || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Award className="w-4 h-4 text-amber-500" />
                      CGPA: <span className="font-bold text-slate-900">{student.cgpa || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {(student.skills || []).map((skill: string) => (
                        <span key={skill} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      {student.status === 'Placed' ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Placed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                          <Clock className="w-3.5 h-3.5" />
                          Unplaced
                        </span>
                      )}
                      {(student.offers || 0) > 0 && (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {student.offers} Offer{student.offers > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
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
