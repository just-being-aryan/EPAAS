import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ApplicantDashboard from "./pages/applicant/Dashboard";
import ApplicationDetails from "./pages/applicant/ApplicationDetails";
import ApplicationView from "./pages/applicant/ApplicationView";
import TaxInvoice from "./pages/applicant/TaxInvoice";
import Requests from "./pages/applicant/Requests";
import NewApplication from "./pages/applicant/NewApplication";
import Profile from "./pages/applicant/Profile";
import NodalDashboard from "./pages/nodal/NodalDashboard";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Applicant */}
        <Route path="/applicant/dashboard" element={<ProtectedRoute><ApplicantDashboard /></ProtectedRoute>} />
        <Route path="/applicant/applications/new" element={<ProtectedRoute><NewApplication /></ProtectedRoute>} />
        <Route path="/applicant/applications" element={<ProtectedRoute><ApplicationDetails /></ProtectedRoute>} />
        <Route path="/applicant/applications/:id" element={<ProtectedRoute><ApplicationView /></ProtectedRoute>} />
        <Route path="/applicant/invoices" element={<ProtectedRoute><TaxInvoice /></ProtectedRoute>} />
        <Route path="/applicant/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/applicant/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Nodal Officer */}
        <Route path="/nodal/dashboard" element={<ProtectedRoute><NodalDashboard /></ProtectedRoute>} />

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/applicant/dashboard" replace />} />
        <Route path="/dashboard/*" element={<Navigate to="/applicant/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
