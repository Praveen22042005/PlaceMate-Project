import { Briefcase, FileText, CheckCircle, Clock, Edit2, Mail, Phone, MapPin, GraduationCap, Code, Award, Link as LinkIcon, Download, Github, Linkedin, ExternalLink, Save, X, Upload, Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';
import { extractTextFromPDF } from '../../utils/pdfParser';
import { parseResume } from '../../services/nvidia';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard', href: '/student', icon: Briefcase },
  { name: 'Browse Jobs', href: '/student/jobs', icon: SearchIcon },
  { name: 'My Applications', href: '/student/applications', icon: FileText },
  { name: 'Interviews', href: '/student/interviews', icon: Clock },
  { name: 'Profile', href: '/student/profile', icon: CheckCircle },
];

// Placeholder for SearchIcon
function SearchIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporary state for editing
  const [editForm, setEditForm] = useState<any>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF resumes are supported');
      return;
    }

    try {
      setIsParsing(true);
      if (!isEditing) setIsEditing(true);

      // 1. Extract Text First (In-Browser)
      setParseProgress('Reading PDF text...');
      const pdfText = await extractTextFromPDF(file);
      
      if (pdfText.length < 50) {
        throw new Error('Not enough text could be extracted from this PDF. It might be an image-based PDF.');
      }

      // 2. AI Parsing
      setParseProgress('AI is parsing your profile...');
      const parsedData = await parseResume(pdfText);

      // 3. Update Form with extracted data immediately
      setEditForm((prev: any) => ({
        ...prev,
        name: parsedData.name || prev.name,
        phone: parsedData.phone || prev.phone,
        location: parsedData.location || prev.location,
        about: parsedData.about || prev.about,
        skillsStr: parsedData.skills && parsedData.skills.length > 0 
          ? Array.from(new Set([...(prev.skillsStr ? prev.skillsStr.split(',').map((s:string) => s.trim()) : []), ...parsedData.skills])).join(', ')
          : prev.skillsStr,
        links: {
          github: parsedData.links?.github || prev.links?.github || '',
          linkedin: parsedData.links?.linkedin || prev.links?.linkedin || '',
          portfolio: parsedData.links?.portfolio || prev.links?.portfolio || ''
        }
      }));

      // 4. Try Uploading to Firebase Storage in a secondary try-catch block
      try {
        setParseProgress('Uploading document to storage...');
        const storageRef = ref(storage, `resumes/${user.uid}-${Date.now()}.pdf`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setEditForm((prev: any) => ({ ...prev, resumeUrl: downloadURL }));
        toast.success('Resume parsed and uploaded successfully!');
      } catch (uploadObj: any) {
        console.error('Firebase Upload Error:', uploadObj);
        toast.error('AI Profile parsed, but PDF upload failed (Likely CORS issue). You may need to configure Firebase Storage CORS limit.');
      }
    } catch (error: any) {
      console.error('Extraction Error:', error);
      toast.error(error.message || 'Failed to parse resume');
    } finally {
      setIsParsing(false);
      setParseProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pData = {
            name: data.name || data.displayName || "Student Name",
            role: data.department || "Student",
            batch: data.batch || "2024",
            email: data.email || user.email || "student@example.com",
            phone: data.phone || "",
            location: data.location || "",
            about: data.about || "",
            skillsStr: (data.skills || []).join(', '),
            resumeUrl: data.resumeUrl || "",
            links: data.links || {
              github: "",
              linkedin: "",
              portfolio: ""
            }
          };
          setProfileData(pData);
          setEditForm(pData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // parse skills string back to array
      const skillsArray = editForm.skillsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      
      const payload = {
        name: editForm.name,
        department: editForm.role,
        batch: editForm.batch,
        phone: editForm.phone,
        location: editForm.location,
        about: editForm.about,
        skills: skillsArray,
        resumeUrl: editForm.resumeUrl,
        links: editForm.links
      };

      await updateDoc(doc(db, 'users', user.uid), payload);
      setProfileData(editForm);
      setIsEditing(false);
      toast.success("Profile saved successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profileData) {
    return (
      <DashboardLayout role="Student" navItems={navItems}>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-slate-500">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name.startsWith('link_')) {
      const linkKey = name.replace('link_', '');
      setEditForm({
        ...editForm,
        links: {
          ...editForm.links,
          [linkKey]: value
        }
      });
    } else {
      setEditForm({ ...editForm, [name]: value });
    }
  };

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your personal information and resume details.</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => { setIsEditing(false); setEditForm(profileData); }}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleResumeUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || saving}
                className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {parseProgress || 'Parsing'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    AI Auto-Fill Resume
                  </>
                )}
              </button>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          ) : (
            <>
              {profileData.resumeUrl && (
                <a 
                  href={profileData.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  View Resume
                </a>
              )}
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-6 pb-6 pt-16 relative">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-indigo-600 absolute -top-12 left-6">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-3">
                
                {isEditing ? (
                  <div className="space-y-3">
                    <input name="name" value={editForm.name} onChange={handleChange} placeholder="Full Name" className="w-full text-lg font-bold p-2 border border-slate-200 rounded-lg outline-none" />
                    <input name="role" value={editForm.role} onChange={handleChange} placeholder="Department/Role (e.g. Computer Science)" className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none text-indigo-600" />
                    <input name="batch" value={editForm.batch} onChange={handleChange} placeholder="Batch Year (e.g. 2024)" className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none text-slate-500" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-slate-900">{profileData.name}</h3>
                    <p className="text-indigo-600 font-medium text-sm">{profileData.role}</p>
                    <p className="text-slate-500 text-sm mb-4">Batch of {profileData.batch}</p>
                  </>
                )}
                
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {profileData.email} {/* Email is usually non-editable since it's the Firebase auth factor */}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {isEditing ? (
                      <input name="phone" value={editForm.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none" />
                    ) : (profileData.phone || 'Add Phone')}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {isEditing ? (
                      <input name="location" value={editForm.location} onChange={handleChange} placeholder="City, State" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none" />
                    ) : (profileData.location || 'Add Location')}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    {isEditing ? (
                      <input name="resumeUrl" value={editForm.resumeUrl} onChange={handleChange} placeholder="https://drive.google.com/.../resume.pdf" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none" />
                    ) : (
                      <span className="truncate max-w-[200px]">{profileData.resumeUrl || 'Add Resume URL'}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Social Links</span>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                         <Github className="w-4 h-4 text-slate-400 shrink-0" />
                         <input name="link_github" value={editForm.links.github} onChange={handleChange} placeholder="github.com/username" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                         <Linkedin className="w-4 h-4 text-slate-400 shrink-0" />
                         <input name="link_linkedin" value={editForm.links.linkedin} onChange={handleChange} placeholder="linkedin.com/in/username" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                         <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                         <input name="link_portfolio" value={editForm.links.portfolio} onChange={handleChange} placeholder="portfolio.com" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-4">
                      {profileData.links?.github && (
                        <a href={`https://${profileData.links.github}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors">
                          <Github className="w-5 h-5" />
                        </a>
                      )}
                      {profileData.links?.linkedin && (
                        <a href={`https://${profileData.links.linkedin}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Linkedin className="w-5 h-5" />
                        </a>
                      )}
                      {profileData.links?.portfolio && (
                        <a href={`https://${profileData.links.portfolio}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                          <LinkIcon className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-3">About Me</h3>
            {isEditing ? (
              <textarea 
                name="about" 
                value={editForm.about} 
                onChange={handleChange} 
                rows={4} 
                placeholder="Write a short professional summary..."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed">{profileData.about || 'Add a professional summary'}</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              Technical Skills
            </h3>
            {isEditing ? (
              <div>
                <textarea 
                  name="skillsStr" 
                  value={editForm.skillsStr} 
                  onChange={handleChange} 
                  rows={3} 
                  placeholder="React, Node.js, Python, TypeScript..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                />
                <p className="text-xs text-slate-500 mt-2">Separate skills with commas</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profileData.skillsStr ? profileData.skillsStr.split(',').map((skill: string, i: number) => (
                  <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-indigo-100 shadow-sm">
                    {skill.trim()}
                  </span>
                )) : (
                  <p className="text-sm text-slate-500">No skills added yet.</p>
                )}
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-1">Make sure to add your Resume URL!</h4>
                <p className="text-sm text-indigo-700">You must click "Edit Profile" and paste a public URL to your Resume (like Google Drive or Dropbox) before you are allowed to apply to jobs.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
