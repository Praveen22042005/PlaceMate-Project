import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Modal from '../Modal';
import { collection, addDoc, query, where, getDocs, getDoc, doc, documentId } from 'firebase/firestore';
import { db } from '../../firebase';
import { Calendar, Clock, Video, MapPin, User, Briefcase } from 'lucide-react';
import { addNotification } from '../../services/notifications';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleInterviewModal({ isOpen, onClose }: ScheduleInterviewModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [fetchingCandidates, setFetchingCandidates] = useState(false);
  
  const [formData, setFormData] = useState({
    applicationId: '',
    date: '',
    time: '',
    mode: 'Virtual',
    link: '',
    location: '',
    type: 'Technical Round',
    interviewerName: user?.displayName || 'Recruiter'
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    setFetchingCandidates(true);

    const loadCandidates = async () => {
      try {
        const jobsQuery = query(collection(db, 'jobs'), where('recruiterId', '==', user.uid));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobIds = jobsSnapshot.docs.map(doc => doc.id);
        
        if (jobIds.length === 0) {
          setCandidates([]);
          setFetchingCandidates(false);
          return;
        }

        const validApps: any[] = [];
        const chunks = [];
        for (let i = 0; i < jobIds.length; i += 10) {
          chunks.push(jobIds.slice(i, i + 10));
        }

        await Promise.all(chunks.map(async chunk => {
          const appsQuery = query(collection(db, 'applications'), where('jobId', 'in', chunk), where('status', '==', 'Interview'));
          const appsSnapshot = await getDocs(appsQuery);
          appsSnapshot.forEach(d => validApps.push({ id: d.id, ...d.data() }));
        }));

        const studentIds = Array.from(new Set(validApps.map(a => a.studentId).filter(Boolean)));
        const usersMap = new Map();
        const jobsMap = new Map();

        jobsSnapshot.docs.forEach(d => jobsMap.set(d.id, d.data()));

        if (studentIds.length > 0) {
          const studentChunks = [];
          for (let i = 0; i < studentIds.length; i += 10) {
            studentChunks.push(studentIds.slice(i, i + 10));
          }
          await Promise.all(studentChunks.map(async chunk => {
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const usersSnap = await getDocs(usersQuery);
            usersSnap.forEach(d => usersMap.set(d.id, d.data()));
          }));
        }

        const resolvedCandidates = validApps.map(app => {
          let studentName = 'Unknown Candidate';
          let jobTitle = 'Unknown Role';

          if (app.studentId && usersMap.has(app.studentId)) {
            const s = usersMap.get(app.studentId);
            studentName = s.displayName || s.name || studentName;
          }
          if (app.jobId && jobsMap.has(app.jobId)) {
            jobTitle = jobsMap.get(app.jobId).title || jobTitle;
          }

          return {
            id: app.id,
            studentId: app.studentId,
            jobId: app.jobId,
            name: studentName,
            role: jobTitle,
          };
        });

        setCandidates(resolvedCandidates);

      } catch (err) {
        console.error("Error loading candidates:", err);
      } finally {
        setFetchingCandidates(false);
      }
    };

    loadCandidates();

  }, [isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.applicationId || !formData.date || !formData.time) {
        throw new Error('Please fill in all required fields');
      }

      const selectedApp = candidates.find(c => c.id === formData.applicationId);
      if (!selectedApp) throw new Error('Invalid candidate selected');

      // Combine date and time
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      await addDoc(collection(db, 'interviews'), {
        applicationId: selectedApp.id,
        studentId: selectedApp.studentId,
        jobId: selectedApp.jobId,
        recruiterId: user?.uid,
        scheduledAt,
        type: formData.type,
        mode: formData.mode,
        meetingLink: formData.mode === 'Virtual' ? formData.link : null,
        location: formData.mode === 'In-Person' ? formData.location : null,
        status: 'Scheduled',
        interviewerName: formData.interviewerName,
        createdAt: new Date().toISOString()
      });

      if (selectedApp.studentId) {
        await addNotification({
          userId: selectedApp.studentId,
          title: 'Interview Scheduled',
          message: `An interview for ${selectedApp.role} has been scheduled on ${new Date(scheduledAt).toLocaleDateString()} at ${formData.time}.`,
          type: 'interview_scheduled',
          link: '/student/interviews'
        });
      }

      // Reset and close
      setFormData({
        applicationId: '', date: '', time: '', mode: 'Virtual', link: '', location: '', type: 'Technical Round', interviewerName: user?.displayName || 'Recruiter'
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Interview" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-2 text-left">
          <label className="text-sm font-bold text-slate-700">Select Candidate</label>
          <div className="relative">
            <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              required
              name="applicationId"
              value={formData.applicationId}
              onChange={handleChange}
              disabled={fetchingCandidates}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-white appearance-none disabled:bg-slate-50"
            >
              <option value="" disabled>
                {fetchingCandidates ? 'Loading candidates...' : 'Select a candidate at Interview stage'}
              </option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.role}</option>
              ))}
            </select>
          </div>
          {candidates.length === 0 && !fetchingCandidates && (
            <p className="text-xs text-amber-600 font-medium">No candidates are currently marked as "Interview". Please change their status first.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Interview Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Time</label>
            <div className="relative">
              <Clock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="time"
                name="time"
                required
                value={formData.time}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Mode</label>
            <select
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-white"
            >
              <option value="Virtual">Virtual</option>
              <option value="In-Person">In-Person</option>
            </select>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700">Interview Type</label>
            <div className="relative">
              <Briefcase className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Technical, HR..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
              />
            </div>
          </div>

          {formData.mode === 'Virtual' ? (
            <div className="space-y-2 text-left col-span-1 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Meeting Link</label>
              <div className="relative">
                <Video className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  name="link"
                  required
                  value={formData.link}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-left col-span-1 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Office Location / Address</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Building 4, Room 102..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>
            </div>
          )}
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
            disabled={loading || candidates.length === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
