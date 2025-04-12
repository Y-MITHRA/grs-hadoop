import React, { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GrievancePortal from "./components/GrievancePortal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PetitionerRegistration from "./pages/PetitionerRegistration";
import OfficialRegistration from "./pages/OfficialRegistration";
import AdminRegistration from "./pages/AdminRegistration";
import AdminLogin from "./pages/AdminLogin";
import OfficialLogin from "./pages/OfficialLogin";
import PetitionerLogin from "./pages/PetitionerLogin";
import PetitionerDashboard from "./pages/PetitionerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ResourceManagement from "./pages/ResourceManagement";
import OfficialDashboard from "./pages/OfficialDashboard";
import WaterDashboard from "./official_dept/Water";
import RTODashboard from "./official_dept/Rto";
import ElectricityDashboard from "./official_dept/Electricity";
import SubmitGrievance from './pages/SubmitGrievance';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';

function App() {
  useEffect(() => {
    // Any initialization code if needed
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#22c55e',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<GrievancePortal />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/official" element={<OfficialLogin />} />
          <Route path="/login/petitioner" element={<PetitionerLogin />} />
          <Route path="/register/petitioner" element={<PetitionerRegistration />} />
          <Route path="/register/official" element={<OfficialRegistration />} />
          <Route path="/register/admin" element={<AdminRegistration />} />

          {/* Protected Petitioner Routes */}
          <Route element={<ProtectedRoute allowedRoles={['petitioner']} />}>
            <Route path="/petitioner/dashboard" element={<PetitionerDashboard />} />
            <Route path="/submit-grievance" element={<SubmitGrievance />} />
            <Route path="/petitioner/settings" element={<Settings />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/escalated" element={<AdminDashboard />} />
            <Route path="/admin/resource-management" element={<ResourceManagement />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>

          {/* Protected Official Routes */}
          <Route element={<ProtectedRoute allowedRoles={['official']} />}>
            <Route path="/official-dashboard" element={<OfficialDashboard />} />
            <Route path="/official-dashboard/water" element={<WaterDashboard />} />
            <Route path="/official-dashboard/rto" element={<RTODashboard />} />
            <Route path="/official-dashboard/electricity" element={<ElectricityDashboard />} />
            <Route path="/official/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
