import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Modal from '../Modal';
import { collection, addDoc, query, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, MapPin, DollarSign, Calendar, Building, List, AlertCircle, Link } from 'lucide-react';
import AIJobDescription from '../AIJobDescription';

interface RecruiterPostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecruiterPostJobModal({ isOpen, onClose }: RecruiterPostJobModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [needsCompanyLink, setNeedsCompanyLink] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    companyId: '',
    companyName: '',
    location: '',
    type: 'Full-time',
    salaryRange: '',
    deadline: '',
    eligibleBranchesInput: '',
    description: ''
  });

  // Determine if recruiter has a linked company
  useEffect(() => {
    if (!isOpen || !profile) return;

    if (profile.companyId && profile.companyName) {
      // Auto-fill company for this recruiter
      setFormData(prev => ({
        ...prev,
        companyId: profile.companyId!,
        companyName: profile.companyName!
      }));
      setNeedsCompanyLink(false);
    } else {
      // Recruiter hasn't linked to a company yet — show selector
      setNeedsCompanyLink(true);
      const q = query(collection(db, 'companies'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [isOpen, profile]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCompanyLink = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedCompany = companies.find(c => c.id === e.target.value);
    if (!selectedCompany || !user) return;

    setFormData(prev => ({ 
      ...prev, 
      companyId: selectedCompany.id,
      companyName: selectedCompany.name
    }));

    // Persist the company link on the recruiter's profile
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name
      });
      setNeedsCompanyLink(false);
    } catch (err) {
      console.error('Failed to link company to recruiter profile:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title) {
        throw new Error('Job title is required');
      }
      if (!formData.companyId) {
        throw new Error('Please link your company before posting a job');
      }
      if (!user) {
        throw new Error('You must be logged in to post a job');
      }

      const eligibleBranches = formData.eligibleBranchesInput
        ? formData.eligibleBranchesInput.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : [];

      await addDoc(collection(db, 'jobs'), {
        title: formData.title,
        companyId: formData.companyId,
        companyName: formData.companyName,
        location: formData.location,
        type: formData.type,
        salaryRange: formData.salaryRange,
        deadline: formData.deadline,
        eligibleBranches,
        requirements: eligibleBranches,
        description: formData.description,
        status: 'Active',
        applicants: 0,
        recruiterId: profile?.uid || profile?.id || '',
        postedBy: profile?.uid || profile?.id || '',
        postedByRole: 'recruiter',
        createdAt: new Date().toISOString()
      });

      // Reset and close
      setFormData(prev => ({
        ...prev,
        title: '', location: '', type: 'Full-time', 
        salaryRange: '', deadline: '', eligibleBranchesInput: '', description: ''
        // Keep companyId/companyName since they're tied to the profile
      }));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post job');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post New Job" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Company Banner — auto-linked or one-time selector */}
        {needsCompanyLink ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              Link Your Company
            </div>
            <p className="text-xs text-amber-600">
              Select your company below. This will be saved to your profile so you won't need to pick it again.
            </p>
            <div className="relative">
              <Building className="w-5 h-5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                required
                value={formData.companyId}
                onChange={handleCompanyLink}
                className="w-full pl-10 pr-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-shadow bg-white appearance-none text-sm"
              >
                <option value="" disabled>Select your company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
              {formData.companyName?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-900">{formData.companyName}</p>
              <p className="text-xs text-indigo-500">Your linked company • Jobs will be posted under this company</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Job Title</label>
            <div className="relative">
              <Briefcase className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Software Engineer..."
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
                placeholder="Remote, Bangalore..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Job Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-white"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Salary Range</label>
            <div className="relative">
              <DollarSign className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="salaryRange"
                value={formData.salaryRange}
                onChange={handleChange}
                placeholder="8 - 12 LPA"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left md:col-span-2">
            <label className="text-sm font-bold text-slate-700">Deadline</label>
            <div className="relative max-w-xs">
              <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-sm font-bold text-slate-700">Eligible Branches / Requirements</label>
          <div className="relative">
            <List className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              name="eligibleBranchesInput"
              value={formData.eligibleBranchesInput}
              onChange={handleChange}
              placeholder="CSE, IT, ECE (comma separated skills or branches)"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        </div>
        
        <div className="space-y-2 text-left">
          <AIJobDescription
            title={formData.title}
            company={formData.companyName}
            type={formData.type}
            location={formData.location}
            branches={formData.eligibleBranchesInput}
            onGenerated={(desc) => setFormData(prev => ({ ...prev, description: desc }))}
          />
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed job description... or use 'Generate with AI' above"
            rows={6}
            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow resize-y"
          ></textarea>
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
            disabled={loading || needsCompanyLink}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
