import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle2 } from "lucide-react";
import ApplicantLayout, { useApplicantUser } from "./Layout";
import api from "../../lib/api";

const TABS = ["Business Details", "Contact & Login", "FSSAI Licence", "KYC Documents"];

function ReadField({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black bg-gray-50/50 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

// ── Business Details ──────────────────────────────────────────────────────────
function BusinessDetails({ app }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <ReadField label="Business / Entity Name" value={app?.organization_name} />
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Type of Entity"        value="" />
        <ReadField label="PAN Number"            value="" mono />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="GSTIN"                 value={app?.gst_no} mono />
        <ReadField label="Industry Sector"       value="Food Manufacturing" />
      </div>
      <ReadField label="Year of Incorporation"   value="" />
      <ReadField label="Registered Address"      value={app?.address} />
    </div>
  );
}

// ── Contact & Login ───────────────────────────────────────────────────────────
function ContactLogin({ app, user }) {
  const [showChange, setShowChange] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Primary Contact Person" value={app?.authorized_person} />
        <ReadField label="Designation"            value="" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Mobile Number"          value={app?.mobile_number} />
        <ReadField label="Alternate Mobile"       value="" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Email Address"          value={app?.contact_email || user?.email} />
        <ReadField label="Official Website"       value="" />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="text-sm font-bold text-black mb-4">Login Credentials</p>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <ReadField label="Login Email / Username" value={user?.email} />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</p>
            <div className="flex gap-2">
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50/50 tracking-widest text-gray-400">
                ••••••••••
              </div>
              <button
                onClick={() => setShowChange(!showChange)}
                className="px-4 py-2.5 rounded-lg text-xs font-bold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap"
              >
                Change
              </button>
            </div>
          </div>
        </div>
        {showChange && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">New Password</p>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</p>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button onClick={() => setShowChange(false)} className="px-4 py-2 rounded-lg text-xs font-bold border border-black text-black hover:bg-black hover:text-white transition-colors">Cancel</button>
              <button className="px-4 py-2 rounded-lg text-xs font-bold bg-black text-white hover:bg-white hover:text-black border border-black transition-colors">Update Password</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FSSAI Licence ─────────────────────────────────────────────────────────────
function FSSAILicence({ app }) {
  const hasLicence = !!app?.license_no;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="FSSAI Licence Number"  value={app?.license_no} mono />
        <ReadField label="Licence Type"          value={hasLicence ? "Central Licence" : ""} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Issued Date"           value="" />
        <ReadField label="Valid Until"           value="" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <ReadField label="Licensing Authority"   value={hasLicence ? "FSSAI Central, New Delhi" : ""} />
        <ReadField label="Licence Status"        value={hasLicence ? "Active ✓" : ""} />
      </div>
      <ReadField label="Licensed Premises Address" value={app?.manufacturing_address || app?.address} />

      {hasLicence && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Licence is valid and in good standing</p>
            <p className="text-xs text-green-600 mt-0.5">Renewal can be initiated 6 months before expiry</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KYC Documents ─────────────────────────────────────────────────────────────
function KYCDocuments() {
  const DOCS = [
    { label: "Certificate of Incorporation / Partnership Deed", uploaded: false },
    { label: "PAN Card of Business",                            uploaded: false },
    { label: "GST Registration Certificate",                    uploaded: false },
    { label: "FSSAI Licence Copy",                              uploaded: false },
    { label: "Cancelled Cheque / Bank Statement",               uploaded: false },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-black text-sm">KYC Document Upload</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">Upload required business identity documents. PDF/PNG, max 5 MB each.</p>
      </div>
      <div className="divide-y divide-gray-50">
        {DOCS.map((doc) => (
          <div key={doc.label} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${doc.uploaded ? "bg-green-500" : "bg-gray-200"}`} />
              <span className="text-sm text-gray-700 truncate">{doc.label}</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-black text-black hover:bg-black hover:text-white transition-colors flex-shrink-0">
              <Upload size={11} /> Upload
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function ProfileContent() {
  const navigate = useNavigate();
  const { user, notifCount } = useApplicantUser();
  const [tab, setTab]       = useState("Business Details");
  const [app, setApp]       = useState(null);
  const [stats, setStats]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/applications/stats"),
      api.get("/applications", { params: { limit: 1 } }),
    ]).then(([st, list]) => {
      setStats(st.data.stats);
      if (list.data.data[0]) setApp(list.data.data[0]);
    }).catch(() => {});
  }, []);

  const initials = user?.username
    ? user.username.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applicant Portal</p>
          <h1 className="text-xl font-bold text-black">My Profile</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your business information and account settings</p>
        </div>
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-black text-black hover:bg-black hover:text-white transition-colors">
          <ArrowLeft size={13} /> Back to Dashboard
        </button>
      </div>

      {/* Hero banner */}
      <div className="bg-black rounded-2xl px-6 py-5 flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-black font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: "#5FC7E9" }}>
            {initials}
          </div>
          <div>
            <h2 className="text-white font-bold text-base">{app?.organization_name || user?.username}</h2>
            <p className="text-white/60 text-xs mt-0.5">
              Applicant{app?.license_no ? ` · FSSAI Licence: ${app.license_no}` : ""}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          {[
            { label: "Total Apps", value: stats?.total ?? "—" },
            { label: "Approved",   value: stats?.approved ?? "—", cls: "text-yellow-400" },
            { label: "Action Req.",value: notifCount ?? "—",      cls: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="text-center border-l border-white/10 pl-4">
              <div className={`text-lg font-bold ${s.cls ?? "text-white"}`}>{s.value}</div>
              <div className="text-[10px] text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? "border-black text-black" : "border-transparent text-gray-400 hover:text-black"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Business Details" && <BusinessDetails app={app} />}
      {tab === "Contact & Login"  && <ContactLogin app={app} user={user} />}
      {tab === "FSSAI Licence"    && <FSSAILicence app={app} />}
      {tab === "KYC Documents"    && <KYCDocuments />}
    </div>
  );
}

export default function Profile() {
  return (
    <ApplicantLayout pageTitle="My Profile">
      <ProfileContent />
    </ApplicantLayout>
  );
}
