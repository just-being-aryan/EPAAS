import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Download, Eye, ChevronRight,
} from "lucide-react";
import ApplicantLayout from "./Layout";
import api from "../../lib/api";

const TABS = ["Details", "Documents", "Queries", "Decision History", "Timeline"];

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const MAP = {
    draft:    { label: "Draft",          cls: "bg-gray-100 text-gray-600" },
    pending:  { label: "Pending",        cls: "bg-yellow-100 text-yellow-700" },
    scrutiny: { label: "Under Scrutiny", cls: "bg-blue-100 text-blue-700" },
    ec:       { label: "With EC",        cls: "bg-cyan-100 text-cyan-700" },
    query:    { label: "Query Raised",   cls: "bg-orange-500 text-white" },
    approved: { label: "Approved",       cls: "bg-green-600 text-white" },
    rejected: { label: "Rejected",       cls: "bg-red-600 text-white" },
  };
  const s = MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || "—"}</p>
    </div>
  );
}

// ── Details Tab ───────────────────────────────────────────────────────────────
function DetailsTab({ app }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-black text-base mb-5">Application Dossier</h3>
      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
        <Field label="Application ID"    value={app.display_ref} />
        <Field label="Applicant"         value={app.organization_name} />
        <Field label="Product"           value={app.product_name} />
        <Field label="Category"          value={app.app_type} />
        <Field label="Food Category"     value={app.food_category} />
        <Field label="FSSAI Licence No." value={app.license_no} />
        <Field label="Contact Person"    value={app.authorized_person} />
        <Field label="Mobile"            value={app.mobile_number} />
        <Field label="Email"             value={app.contact_email} />
        <Field label="GST No."           value={app.gst_no} />
        <Field label="Submitted On"      value={fmt(app.submitted_at)} />
        <Field label="Last Updated"      value={fmt(app.updated_at)} />
      </div>
      {app.address && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <Field label="Registered Address" value={app.address} />
        </div>
      )}
      {app.ingredients && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <Field label="Ingredients / Additives" value={app.ingredients} />
        </div>
      )}
      {(app.regulatory_status_text || app.safety_info) && (
        <div className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-2 gap-6">
          {app.regulatory_status_text && <Field label="Regulatory Status" value={app.regulatory_status_text} />}
          {app.safety_info && <Field label="Safety Information" value={app.safety_info} />}
        </div>
      )}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ app }) {
  const MOCK_DOCS = [
    { name: "Application Form", type: "PDF", status: "verified", size: "1.2 MB" },
    { name: "Payment Receipt",  type: "PDF", status: app.payment_status === "paid" ? "verified" : "pending", size: "580 KB" },
  ];
  const STATUS_CLS = {
    verified: "bg-gray-100 text-gray-600",
    pending:  "bg-orange-100 text-orange-600",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-black text-base">DOSSIER — Document Viewer</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {["Document", "Type", "Status", "Size", "Action"].map((h) => (
              <th key={h} className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_DOCS.map((doc) => (
            <tr key={doc.name} className="border-t border-gray-50 hover:bg-gray-50/50">
              <td className="px-6 py-4 font-medium text-black">{doc.name}</td>
              <td className="px-6 py-4 text-gray-500">{doc.type}</td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_CLS[doc.status] ?? STATUS_CLS.pending}`}>
                  {doc.status === "verified" ? "Verified" : doc.status === "pending" ? "Pending" : "Rejected"}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-400 text-xs">{doc.size}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-black hover:bg-white hover:text-black border border-black text-white transition-colors">
                    <Download size={11} /> PDF
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors">
                    <Eye size={11} /> View
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Queries Tab ───────────────────────────────────────────────────────────────
function QueriesTab({ app }) {
  if (app.status !== "query" && app.status !== "scrutiny" && app.status !== "ec") {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-black text-base mb-4">Query History</h3>
        <div className="py-10 text-center">
          <AlertCircle size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No queries raised for this application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-black text-base mb-4">Query History</h3>
      <div className="space-y-3">
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-black">Query #1</span>
            <span className="text-[11px] text-gray-400">{fmt(app.updated_at)}</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">The authority has raised a query on your application. Please review and respond with the required documents.</p>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700">Pending Response</span>
        </div>
      </div>
    </div>
  );
}

// ── Decision History Tab ──────────────────────────────────────────────────────
function DecisionHistoryTab({ app }) {
  const hasDecision = app.status === "approved" || app.status === "rejected";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-black text-base mb-4">Decision History</h3>
      {!hasDecision ? (
        <div className="py-8 text-center">
          <p className="text-gray-400 text-sm">
            No formal decisions recorded yet.{" "}
            {app.status === "ec" ? "Application is currently with Expert Committee." : "Application is under review."}
          </p>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-black capitalize">Final Decision</span>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-[11px] text-gray-400">Decision Date: {fmt(app.decision_at)}</p>
        </div>
      )}
    </div>
  );
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({ app }) {
  const ORDER = ["draft", "pending", "scrutiny", "ec", "query", app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : null].filter(Boolean);
  const LABELS = {
    draft:    { label: "Application Created",    desc: "Draft saved by applicant" },
    pending:  { label: "Submitted & Payment",    desc: "Application submitted with payment reference" },
    scrutiny: { label: "Under Document Scrutiny",desc: "Nodal officer reviewing documents" },
    ec:       { label: "Referred to Expert Committee", desc: "Application forwarded to EC for review" },
    query:    { label: "Query Raised",           desc: "Authority has raised a query" },
    approved: { label: "Application Approved",   desc: "FSSAI has issued product approval" },
    rejected: { label: "Application Rejected",   desc: "Application not approved" },
  };

  const statusOrder = ["draft", "pending", "scrutiny", "ec", "query", "approved", "rejected"];
  const currentIdx = statusOrder.indexOf(app.status);

  const steps = ORDER.map((st) => ({
    ...LABELS[st],
    status: st,
    done: statusOrder.indexOf(st) <= currentIdx,
    current: st === app.status,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-black text-base mb-6">Application Timeline</h3>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.current ? "bg-black text-white" : step.done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-300"}`}>
                {step.done && !step.current ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              {i < steps.length - 1 && <div className={`w-0.5 flex-1 my-1 ${step.done ? "bg-green-200" : "bg-gray-100"}`} style={{ minHeight: "2rem" }} />}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-bold ${step.current ? "text-black" : step.done ? "text-gray-700" : "text-gray-300"}`}>{step.label}</p>
              <p className={`text-xs mt-0.5 ${step.done ? "text-gray-400" : "text-gray-200"}`}>{step.desc}</p>
              {step.current && <span className="inline-block mt-1.5 px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded-full">Current Stage</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function ViewContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState("Details");

  useEffect(() => {
    api.get(`/applications/${id}`)
      .then((r) => setApp(r.data.data))
      .catch(() => navigate("/applicant/applications"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>;
  if (!app)    return null;

  return (
    <div className="flex flex-col min-h-full">

      {/* App Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black mb-3 transition-colors font-medium">
          <ArrowLeft size={13} /> Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Applicant / Application View</p>
            <h1 className="text-xl font-bold text-black">{app.display_ref}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{app.organization_name ?? ""}{app.product_name ? ` · ${app.product_name}` : ""}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t ? "border-black text-black" : "border-transparent text-gray-400 hover:text-black"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          {tab === "Details"          && <DetailsTab app={app} />}
          {tab === "Documents"        && <DocumentsTab app={app} />}
          {tab === "Queries"          && <QueriesTab app={app} />}
          {tab === "Decision History" && <DecisionHistoryTab app={app} />}
          {tab === "Timeline"         && <TimelineTab app={app} />}
        </div>

        {/* Right panel */}
        <div className="w-60 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Application Summary</p>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400">Status</span>
                <div className="mt-1"><StatusBadge status={app.status} /></div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">App. Type</span>
                <span className="font-semibold text-black">{app.app_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Submitted</span>
                <span className="font-semibold text-black">{fmt(app.submitted_at)}</span>
              </div>
              {app.fee_amount && (
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-400">Fee Paid</span>
                  <span className="font-bold text-black">₹{Number(app.fee_amount).toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors flex items-center justify-between">
                Download Receipt <ChevronRight size={12} />
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors flex items-center justify-between">
                View Invoice <ChevronRight size={12} />
              </button>
              {app.status === "query" && (
                <button onClick={() => navigate(`/applicant/applications/${app.id}/respond`)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold bg-black text-white hover:bg-white hover:text-black border border-black transition-colors flex items-center justify-between">
                  Respond to Query <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationView() {
  return (
    <ApplicantLayout pageTitle="Application Details">
      <ViewContent />
    </ApplicantLayout>
  );
}
