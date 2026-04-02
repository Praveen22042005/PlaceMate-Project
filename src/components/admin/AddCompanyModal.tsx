import { useState, ChangeEvent, FormEvent } from 'react';
import Modal from '../Modal';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Building, Globe, MapPin, Briefcase } from 'lucide-react';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCompanyModal({ isOpen, onClose }: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    location: '',
    website: '',
    tier: 'Tier 1',
    highestPackage: '',
    status: 'Active',
    activeJobs: 0,
    totalHired: 0
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.industry) {
        throw new Error('Name and Industry are required');
      }

      await addDoc(collection(db, 'companies'), {
        ...formData,
        createdAt: new Date().toISOString()
      });

      // Reset and close
      setFormData({
        name: '', industry: '', location: '', website: '', tier: 'Tier 1', highestPackage: '', status: 'Active', activeJobs: 0, totalHired: 0
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add company');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Company" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Company Name</label>
            <div className="relative">
              <Building className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Google, Microsoft..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Industry</label>
            <div className="relative">
              <Briefcase className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="industry"
                required
                value={formData.industry}
                onChange={handleChange}
                placeholder="Technology, Finance..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Location</label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Bangalore, IND"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Website</label>
            <div className="relative">
              <Globe className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="www.example.com"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Tier Classification</label>
            <select
              name="tier"
              value={formData.tier}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-white"
            >
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
            </select>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Highest Package (LPA)</label>
            <input
              type="text"
              name="highestPackage"
              value={formData.highestPackage}
              onChange={handleChange}
              placeholder="e.g. 40 LPA"
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Saving...' : 'Add Company'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
