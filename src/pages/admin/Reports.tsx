import { Users, Building, Briefcase, TrendingUp, LayoutDashboard, Download, FileText } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Reports', href: '/admin/reports', icon: TrendingUp },
];

export default function AdminReports() {
  const [generating, setGenerating] = useState<string | null>(null);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => {
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = async (title: string) => {
    setGenerating(title);
    try {
      if (title === 'Unplaced Students List') {
        const snapshot = await getDocs(collection(db, 'users'));
        const students = snapshot.docs
          .map(doc => doc.data())
          .filter(user => user.role === 'student' && user.status === 'Unplaced')
          .map(s => ({
            Name: s.displayName || 'N/A',
            Email: s.email || 'N/A',
            RollNo: s.rollNo || 'N/A',
            Department: s.dept || 'N/A',
            CGPA: s.cgpa || 'N/A'
          }));
        downloadCSV(students, 'unplaced_students');
      } else if (title === 'Company Visit Summary') {
        const snapshot = await getDocs(collection(db, 'companies'));
        const companies = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            Company: data.name || 'N/A',
            Industry: data.industry || 'N/A',
            Tier: data.tier || 'N/A',
            ActiveJobs: data.activeJobs || 0,
            TotalHired: data.totalHired || 0,
            HighestPackage: data.highestPackage || 'N/A'
          };
        });
        downloadCSV(companies, 'company_visit_summary');
      } else if (title === 'Overall Placement Report') {
        const snapshot = await getDocs(collection(db, 'users'));
        const students = snapshot.docs
          .map(doc => doc.data())
          .filter(user => user.role === 'student' && user.status === 'Placed')
          .map(s => ({
            Name: s.displayName || 'N/A',
            RollNo: s.rollNo || 'N/A',
            Department: s.dept || 'N/A',
            Offers: s.offers || 0
          }));
        downloadCSV(students, 'overall_placement_report');
      } else {
        // Placeholder for other reports
        toast.error(`Report generation for "${title}" is not fully implemented yet.`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Placement Reports</h2>
          <p className="text-slate-500 text-sm">Generate and download placement analytics reports.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Download className="w-5 h-5" />
          Export All Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Overall Placement Report', desc: 'Comprehensive report of all placements for the current academic year.', type: 'CSV' },
          { title: 'Department-wise Analysis', desc: 'Detailed breakdown of placement statistics by department.', type: 'CSV' },
          { title: 'Company Visit Summary', desc: 'List of companies visited, roles offered, and students hired.', type: 'CSV' },
          { title: 'Unplaced Students List', desc: 'List of students currently seeking placement opportunities.', type: 'CSV' },
          { title: 'Salary Package Analytics', desc: 'Analysis of highest, average, and median salary packages.', type: 'CSV' },
          { title: 'Interview Conversion Rates', desc: 'Statistics on interview rounds and final selections.', type: 'CSV' },
        ].map((report, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                {report.type}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{report.title}</h3>
            <p className="text-sm text-slate-500 flex-1 mb-6">{report.desc}</p>
            <button 
              onClick={() => generateReport(report.title)}
              disabled={generating === report.title}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generating === report.title ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
