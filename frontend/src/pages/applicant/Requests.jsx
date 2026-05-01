import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, X,
} from "lucide-react";
import ApplicantLayout from "./Layout";
import api from "../../lib/api";

const TABS = [
  { key: "appeal",    label: "Appeal against Rejection" },
  { key: "review",    label: "Review against Appellate Order" },
  { key: "extension", label: "Extension of Time" },
];

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(fromDate, windowDays = 30) {
  if (!fromDate) return null;
  const diff = windowDays - Math.floor((Date.now() - new Date(fromDate)) / 86400000);
  return diff;
}

function TypeBadge({ type }) {
  const COLORS = {
    NSF: "bg-gray-100 text-gray-700", CA: "bg-blue-100 text-blue-700",
    AA: "bg-violet-100 text-violet-700", rPET: "bg-teal-100 text-teal-700",
    "Any Other": "bg-orange-100 text-orange-700",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${COLORS[type] ?? "bg-gray-100 text-gray-600"}`}>{type}</span>;
}

function StatusBadge({ status }) {
  const MAP = {
    pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
    accepted: "bg-green-600 text-white border-green-600",
    approved: "bg-green-600 text-white border-green-600",
    rejected: "bg-red-600 text-white border-red-600",
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${MAP[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {label}
    </span>
  );
}

function StatCards({ stats, tab }) {
  const cards =
    tab === "extension"
      ? [
          { label: "Total Requests", value: stats?.total ?? "—", Icon: FileText,     color: "text-black", bg: "bg-blue-50" },
          { label: "Pending",        value: stats?.pending ?? "—", Icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Approved",       value: stats?.approved ?? "—", Icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
          { label: "Rejected",       value: stats?.rejected ?? "—", Icon: XCircle,      color: "text-red-600",    bg: "bg-red-50" },
        ]
      : [
          { label: "Total Filed",    value: stats?.total ?? "—",    Icon: FileText,     color: "text-black", bg: "bg-blue-50" },
          { label: "Pending",        value: stats?.pending ?? "—",  Icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Accepted",       value: stats?.accepted ?? "—", Icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
          { label: "Rejected",       value: stats?.rejected ?? "—", Icon: XCircle,      color: "text-red-600",    bg: "bg-red-50" },
        ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
            <Icon size={18} className={color} />
          </div>
          <div className={`text-2xl font-bold leading-none ${color}`}>{value}</div>
          <div className="text-[10px] font-medium text-gray-500 mt-1.5 leading-tight">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Appeal tab ────────────────────────────────────────────────────────────────

function AppealsTab() {
  const [data, setData]     = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/applications/requests/appeals")
      .then((r) => { setData(r.data.data); setStats(r.data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <StatCards stats={stats} tab="appeal" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-black text-sm">Appeals against Rejection</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Appeals must be filed within 30 days of rejection.</p>
        </div>
        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <EmptyState label="No appeals filed yet." sub="You can appeal from the Dashboard or Application Details page against rejected applications." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {["SR.", "Reference No.", "Company", "Product", "App. Type", "Food Category", "Rejection Date", "Days Left", "Appeal Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const dl = daysLeft(row.decision_at, 30);
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-400 text-center">{i + 1}</td>
                      <td className="px-4 py-3 border-b border-gray-50"><span className="font-mono text-[11px] text-gray-700">{row.display_ref}</span></td>
                      <td className="px-4 py-3 border-b border-gray-50 font-medium text-black max-w-[140px] truncate">{row.organization_name ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-600 max-w-[120px] truncate">{row.product_name ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50"><TypeBadge type={row.app_type} /></td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{row.food_category ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{fmt(row.decision_at)}</td>
                      <td className="px-4 py-3 border-b border-gray-50">
                        {dl !== null ? (
                          <span className={`font-semibold ${dl > 10 ? "text-green-600" : dl > 0 ? "text-orange-500" : "text-red-600"}`}>
                            {dl > 0 ? `${dl}d` : "Expired"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-50"><StatusBadge status={row.decision} /></td>
                      <td className="px-4 py-3 border-b border-gray-50">
                        <button className="px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Review tab ────────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [data, setData]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/applications/requests/reviews")
      .then((r) => { setData(r.data.data); setStats(r.data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <StatCards stats={stats} tab="review" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-black text-sm">Reviews against Appellate Order</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Reviews must be filed within 30 days of appeal rejection.</p>
        </div>
        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <EmptyState label="No reviews filed yet." sub="You can file a review after your appeal against rejection has been rejected." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {["SR.", "Reference No.", "Company", "Product", "App. Type", "Food Category", "Appeal Rejected On", "Days Left", "Review Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const dl = daysLeft(row.appeal_rejected_on, 30);
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-400 text-center">{i + 1}</td>
                      <td className="px-4 py-3 border-b border-gray-50"><span className="font-mono text-[11px] text-gray-700">{row.display_ref}</span></td>
                      <td className="px-4 py-3 border-b border-gray-50 font-medium text-black max-w-[140px] truncate">{row.organization_name ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-600 max-w-[120px] truncate">{row.product_name ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50"><TypeBadge type={row.app_type} /></td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{row.food_category ?? "—"}</td>
                      <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{fmt(row.appeal_rejected_on)}</td>
                      <td className="px-4 py-3 border-b border-gray-50">
                        {dl !== null ? (
                          <span className={`font-semibold ${dl > 10 ? "text-green-600" : dl > 0 ? "text-orange-500" : "text-red-600"}`}>
                            {dl > 0 ? `${dl}d` : "Expired"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-50"><StatusBadge status={row.chairperson_decision} /></td>
                      <td className="px-4 py-3 border-b border-gray-50">
                        <button className="px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Extension tab ─────────────────────────────────────────────────────────────

function ExtensionTab() {
  const [data, setData]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [queryApps, setQueryApps] = useState([]);
  const [form, setForm]         = useState({ application_id: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState("");

  const load = useCallback(() => {
    api.get("/applications/requests/extensions")
      .then((r) => { setData(r.data.data); setStats(r.data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = async () => {
    if (!queryApps.length) {
      const res = await api.get("/applications", { params: { bin: "reverted", limit: 100 } }).catch(() => null);
      if (res) setQueryApps(res.data.data);
    }
    setShowForm(true);
    setForm({ application_id: "", reason: "" });
    setErr("");
  };

  const handleSubmit = async () => {
    if (!form.application_id) { setErr("Please select an application."); return; }
    if (!form.reason.trim())  { setErr("Please enter a reason."); return; }
    setSubmitting(true);
    try {
      await api.post(`/applications/${form.application_id}/extension-request`, { reason: form.reason });
      setShowForm(false);
      setLoading(true);
      load();
    } catch (e) {
      setErr(e.response?.data?.message ?? "Failed to submit request.");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <StatCards stats={stats} tab="extension" />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-black text-sm">Extension of Time Requests</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Request additional time to respond to authority queries.</p>
          </div>
          <button onClick={openForm}
            className="flex items-center gap-1.5 bg-black hover:bg-white hover:text-black border border-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            <Plus size={13} /> Create New Request
          </button>
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="px-5 py-4 bg-blue-50/60 border-b border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-black">New Extension Request</span>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Select Application *</label>
                <select value={form.application_id} onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 bg-white focus:outline-none focus:border-black">
                  <option value="">-- Select application with active query --</option>
                  {queryApps.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_ref} — {a.organization_name ?? "No name"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Reason for Extension *</label>
                <textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Describe why you need more time..."
                  className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 bg-white focus:outline-none focus:border-black resize-none" />
              </div>
            </div>
            {err && <p className="text-red-600 text-xs mt-2">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={handleSubmit} disabled={submitting}
                className="bg-black hover:bg-white hover:text-black border border-black text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-black text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <EmptyState label="No extension requests yet." sub='Click "Create New Request" to request more time to respond to a query.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {["SR.", "Reference No.", "App. Type", "Food Category", "Request Date", "Status", "Authority Remarks", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-400 text-center">{i + 1}</td>
                    <td className="px-4 py-3 border-b border-gray-50"><span className="font-mono text-[11px] text-gray-700">{row.display_ref}</span></td>
                    <td className="px-4 py-3 border-b border-gray-50"><TypeBadge type={row.app_type} /></td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{row.food_category ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{fmt(row.created_at)}</td>
                    <td className="px-4 py-3 border-b border-gray-50"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 max-w-[160px] truncate">{row.remarks ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50">
                      <button className="px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────

function EmptyState({ label, sub }) {
  return (
    <div className="py-14 text-center px-6">
      <AlertCircle size={32} className="text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      {sub && <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function PageContent() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") ?? "appeal";
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : "appeal";

  return (
    <div className="p-4 sm:p-6">
      {activeTab === "appeal"    && <AppealsTab />}
      {activeTab === "review"    && <ReviewsTab />}
      {activeTab === "extension" && <ExtensionTab />}
    </div>
  );
}

export default function Requests() {
  return (
    <ApplicantLayout pageTitle="Requests">
      <PageContent />
    </ApplicantLayout>
  );
}
