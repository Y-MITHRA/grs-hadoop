import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GeneralContextProvider from "./context/GeneralContext";
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
import OfficialDashboard from "./pages/OfficialDashboard";
import WaterDashboard from "./official_dept/Water";
import RTODashboard from "./official_dept/Rto";
import ElectricityDashboard from "./official_dept/Electricity";
import SubmitGrievance from './pages/SubmitGrievance';

function App() {
  return (
    <Router>
      <GeneralContextProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<GrievancePortal />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/petitioner" element={<PetitionerRegistration />} />
          <Route path="/register/official" element={<OfficialRegistration />} />
          <Route path="/register/admin" element={<AdminRegistration />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/official" element={<OfficialLogin />} />
          <Route path="/login/petitioner" element={<PetitionerLogin />} />
          <Route path="/submit-grievance" element={<SubmitGrievance />} />

          <Route path="/login/petitioner/dashboard" element={<PetitionerDashboard />} />

          <Route element={<ProtectedRoute allowedRoles={["official"]} />}>
            <Route path="/official-dashboard" element={<OfficialDashboard />} />
            <Route path="/official-dashboard/water" element={<WaterDashboard />} />
            <Route path="/official-dashboard/rto" element={<RTODashboard />} />
            <Route path="/official-dashboard/electricity" element={<ElectricityDashboard />} />
          </Route>




          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </GeneralContextProvider>
    </Router>
  );
}

export default App;


