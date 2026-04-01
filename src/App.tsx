/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';

import StudentDashboard from './pages/StudentDashboard';
import StudentApplications from './pages/student/Applications';
import StudentInterviews from './pages/student/Interviews';
import StudentProfile from './pages/student/Profile';

import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/admin/Students';
import AdminCompanies from './pages/admin/Companies';
import AdminJobs from './pages/admin/Jobs';
import AdminReports from './pages/admin/Reports';

import RecruiterDashboard from './pages/RecruiterDashboard';
import RecruiterJobs from './pages/recruiter/Jobs';
import RecruiterCandidates from './pages/recruiter/Candidates';
import RecruiterInterviews from './pages/recruiter/Interviews';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/applications" element={<ProtectedRoute allowedRoles={['student']}><StudentApplications /></ProtectedRoute>} />
          <Route path="/student/interviews" element={<ProtectedRoute allowedRoles={['student']}><StudentInterviews /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<ProtectedRoute allowedRoles={['admin']}><AdminCompanies /></ProtectedRoute>} />
          <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['admin']}><AdminJobs /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
          
          {/* Recruiter Routes */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/recruiter/jobs" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterJobs /></ProtectedRoute>} />
          <Route path="/recruiter/candidates" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterCandidates /></ProtectedRoute>} />
          <Route path="/recruiter/interviews" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterInterviews /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
