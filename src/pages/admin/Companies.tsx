import { Building, Briefcase, FileBarChart, Search, Filter, Plus, MoreVertical, MapPin, Globe, Mail, Phone, Users, Star, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AddCompanyModal from '../../components/admin/AddCompanyModal';
import FilterPanel, { ActiveFilters, FilterGroup } from '../../components/FilterPanel';
import { TableSkeleton } from '../../components/Skeletons';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: TrendingUp },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Tier 1': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Tier 2': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Tier 3': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

import { useFirestoreCollection } from '../../hooks/useFirestore';

export default function AdminCompanies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ tier: [], status: [] });
  const itemsPerPage = 10;
  
  const { data: companies, loading } = useFirestoreCollection('companies');

  // Build filter groups with live counts
  const filterGroups: FilterGroup[] = [
    {
      id: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'Tier 1', label: 'Tier 1', count: companies.filter(c => c.tier === 'Tier 1').length },
        { value: 'Tier 2', label: 'Tier 2', count: companies.filter(c => c.tier === 'Tier 2').length },
        { value: 'Tier 3', label: 'Tier 3', count: companies.filter(c => c.tier === 'Tier 3').length },
      ].filter(o => o.count > 0),
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Active', label: 'Active', count: companies.filter(c => c.status === 'Active').length },
        { value: 'Inactive', label: 'Inactive', count: companies.filter(c => c.status === 'Inactive' || !c.status).length },
      ],
    },
  ];

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchTerm ||
      company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = activeFilters.tier.length === 0 || activeFilters.tier.includes(company.tier);
    const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(company.status || 'Inactive');

    return matchesSearch && matchesTier && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPartners = companies.length;
  const activeHiring = companies.filter(c => c.activeJobs > 0).length;
  const tier1Companies = companies.filter(c => c.tier === 'Tier 1').length;
  const totalOffersMade = companies.reduce((acc, c) => acc + (c.totalHired || 0), 0);

  const toggleStatus = async (companyId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await updateDoc(doc(db, 'companies', companyId), { status: newStatus });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'companies', companyId));
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Company Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage recruiting partners, track hiring metrics, and view active jobs.</p>
        </div>
        <div className="flex gap-3">
          <FilterPanel
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(f) => { setActiveFilters(f); setCurrentPage(1); }}
            resultCount={filteredCompanies.length}
            totalCount={companies.length}
          />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Total Partners</p>
            <h4 className="text-2xl font-bold text-blue-900">{totalPartners}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-blue-500">
            <Building className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">Active Hiring</p>
            <h4 className="text-2xl font-bold text-emerald-900">{activeHiring}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-emerald-500">
            <Building className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600 mb-1">Tier 1 Companies</p>
            <h4 className="text-2xl font-bold text-purple-900">{tier1Companies}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-purple-500">
            <Building className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600 mb-1">Total Offers Made</p>
            <h4 className="text-2xl font-bold text-amber-900">{totalOffersMade}</h4>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm text-amber-500">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search companies, industries..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full shadow-sm transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>Showing {paginatedCompanies.length} of {filteredCompanies.length} companies</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
             <TableSkeleton columns={5} rows={5} />
          ) : paginatedCompanies.length === 0 ? (
             <div className="p-8 text-center text-slate-500">No companies found.</div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Classification</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hiring Metrics</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg border border-slate-200 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                        {company.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{company.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-medium mb-1">{company.industry || 'N/A'}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {company.location || 'N/A'}</span>
                          {company.website && (
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> <a href={`https://${company.website}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{company.website}</a></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getTierColor(company.tier)}`}>
                        {company.tier || 'Unrated'}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        {company.highestPackage || 'N/A'} Max
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Active Jobs:</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{company.activeJobs || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Total Hired:</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{company.totalHired || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {company.status === 'Active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
                        Inactive
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
                            onClick={() => toggleStatus(company.id, company.status)}
                            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-slate-50"
                          >
                            Mark {company.status === 'Active' ? 'Inactive' : 'Active'}
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
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
      
      <AddCompanyModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
