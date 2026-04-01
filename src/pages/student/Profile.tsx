import { Briefcase, FileText, CheckCircle, Clock, Edit2, Mail, Phone, MapPin, GraduationCap, Code, Award, Link as LinkIcon, Download, Github, Linkedin, ExternalLink } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const navItems = [
  { name: 'Dashboard', href: '/student', icon: Briefcase },
  { name: 'My Applications', href: '/student/applications', icon: FileText },
  { name: 'Interviews', href: '/student/interviews', icon: Clock },
  { name: 'Profile', href: '/student/profile', icon: CheckCircle },
];

export default function StudentProfile() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            name: data.name || "Student Name",
            role: data.department || "Student",
            batch: data.batch || "N/A",
            email: data.email || "student@example.com",
            phone: data.phone || "N/A",
            location: data.location || "N/A",
            about: data.about || "No description provided.",
            education: data.education || [],
            skills: data.skills || {
              languages: [],
              frontend: [],
              backend: [],
              database: [],
              tools: []
            },
            internships: data.internships || [],
            projects: data.projects || [],
            certifications: data.certifications || [],
            achievements: data.achievements || [],
            links: data.links || {
              github: "",
              linkedin: "",
              portfolio: ""
            }
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="Student" navItems={navItems}>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-slate-500">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profileData) {
    return (
      <DashboardLayout role="Student" navItems={navItems}>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-slate-500">Profile not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="Student" navItems={navItems}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your personal information and resume details.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Download Resume
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-6 pb-6 relative">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-indigo-600 absolute -top-12 left-6">
                {profileData.name.charAt(0)}
              </div>
              <div className="mt-14">
                <h3 className="text-xl font-bold text-slate-900">{profileData.name}</h3>
                <p className="text-indigo-600 font-medium text-sm">{profileData.role}</p>
                <p className="text-slate-500 text-sm mb-4">Batch of {profileData.batch}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {profileData.email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {profileData.phone}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {profileData.location}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center gap-4">
                  <a href={`https://${profileData.links.github}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                  <a href={`https://${profileData.links.linkedin}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href={`https://${profileData.links.portfolio}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                    <LinkIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              Technical Skills
            </h3>
            <div className="space-y-4">
              {Object.entries(profileData.skills).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {(skills as string[]).map(skill => (
                      <span key={skill} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Achievements
            </h3>
            <ul className="space-y-3">
              {profileData.achievements.map((achievement: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-3">About Me</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{profileData.about}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Education
            </h3>
            <div className="space-y-6">
              {profileData.education.map((edu: any, index: number) => (
                <div key={index} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-500"></div>
                  <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                  <p className="text-indigo-600 text-sm font-medium mb-1">{edu.institution}</p>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{edu.year}</span>
                    <span className="font-bold text-slate-700">{edu.cgpa || edu.percentage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Experience
            </h3>
            <div className="space-y-6">
              {profileData.internships.map((internship: any, index: number) => (
                <div key={index} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent pb-6 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-500"></div>
                  <h4 className="font-bold text-slate-900">{internship.role}</h4>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-indigo-600 text-sm font-medium">{internship.company}</p>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{internship.duration}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{internship.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Projects
            </h3>
            <div className="grid gap-4">
              {profileData.projects.map((project: any, index: number) => (
                <div key={index} className="border border-slate-100 rounded-xl p-5 hover:border-indigo-100 hover:shadow-sm transition-all bg-slate-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-slate-900">{project.name}</h4>
                    <a href={`https://${project.link}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs font-bold text-indigo-600 mb-3 uppercase tracking-wider">{project.tech}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Certifications
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {profileData.certifications.map((cert: any, index: number) => (
                <div key={index} className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{cert.name}</h4>
                    <p className="text-xs text-slate-500">{cert.issuer} • {cert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
