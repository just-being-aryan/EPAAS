import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ApplicantDashboard from "./pages/applicant/Dashboard";
import ApplicationDetails from "./pages/applicant/ApplicationDetails";
import ApplicationView from "./pages/applicant/ApplicationView";
import TaxInvoice from "./pages/applicant/TaxInvoice";
import Requests from "./pages/applicant/Requests";
import NewApplication from "./pages/applicant/NewApplication";
import Profile from "./pages/applicant/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ApplicantDashboard />} />
        <Route path="/dashboard/applications/new" element={<NewApplication />} />
        <Route path="/dashboard/applications" element={<ApplicationDetails />} />
        <Route path="/dashboard/applications/:id" element={<ApplicationView />} />
        <Route path="/dashboard/invoices" element={<TaxInvoice />} />
        <Route path="/dashboard/requests" element={<Requests />} />
        <Route path="/dashboard/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
