import { useEffect, useState } from "react";
import { Award, BellRing, CalendarDays, CheckCircle2, ClipboardList, FileSearch, Send, X, XCircle } from "lucide-react";
import ExpertLayout from "./ExpertLayout";
import api from "../../lib/api";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function TH({ children }) {
  return <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50/80">{children}</th>;
}

function TD({ children, className = "" }) {
  return <td className={`px-3 py-2.5 border-b border-gray-50 align-middle text-xs ${className}`}>{children}</td>;
}

function StatusBadge({ status, label }) {
  const map = {
    ec: "bg-purple-100 text-purple-700 border-purple-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    clarification: "bg-orange-100 text-orange-700 border-orange-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  const key = String(status ?? "").toLowerCase();
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${map[key] ?? map.pending}`}>{label ?? status ?? "-"}</span>;
}

function ActionButton({ children, onClick, variant = "primary", disabled }) {
  const cls = {
    primary: "bg-[#3D1C10] text-white hover:bg-[#2a120a]",
    amber: "bg-[#B45309] text-white hover:bg-[#92400e]",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${cls[variant]}`}>{children}</button>;
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-3">
      <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Expert Committee</div>
      <h2 className="text-lg font-bold text-black leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function AppTable({ rows, loading, onOpen, onDecision, empty = "No cases found" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead><tr><TH>Sr.</TH><TH>App. Ref.</TH><TH>Company</TH><TH>Product</TH><TH>Type</TH><TH>Risk</TH><TH>TO</TH><TH>EC Status</TH><TH>Action</TH></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-gray-400 text-xs">{empty}</td></tr> : rows.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30">
                  <TD>{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-gray-700">{app.reference_no ?? app.display_ref}</span></TD>
                  <TD className="font-medium text-black max-w-[160px] truncate">{app.organization_name}</TD>
                  <TD className="max-w-[150px] truncate">{app.product_name}</TD>
                  <TD>{app.app_type}</TD>
                  <TD><StatusBadge status={app.risk_level === "High" ? "rejected" : app.risk_level === "Medium" ? "clarification" : "approved"} label={app.risk_level ?? "Unmarked"} /></TD>
                  <TD>{app.technical_officer_name ?? "-"}</TD>
                  <TD><StatusBadge status={app.ec_status === "Pending" ? "ec" : app.ec_status} label={app.ec_status} /></TD>
                  <TD><div className="flex gap-1.5"><ActionButton onClick={() => onOpen(app)}><FileSearch size={12} /> Open</ActionButton><ActionButton variant="amber" onClick={() => onDecision(app)}><Send size={12} /> Record Decision</ActionButton></div></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DecisionModal({ app, onClose, onDone }) {
  const [decisionType, setDecisionType] = useState("Approved");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!app) return null;

  const submit = async () => {
    setSaving(true); setError("");
    try {
      await api.post(`/expert/applications/${app.id}/decision`, { decision_type: decisionType, remarks });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to record decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div><div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Record EC Decision</div><h3 className="font-bold text-black">{app.reference_no}</h3><p className="text-xs text-gray-500">{app.product_name}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">Decision</label>
        <select value={decisionType} onChange={(e) => setDecisionType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black">
          <option>Approved</option>
          <option>Rejected</option>
          <option>Clarification</option>
        </select>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Committee observations, conditions, or clarification points..." className="w-full min-h-32 mt-3 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-black resize-none" />
        <div className="flex justify-end gap-2 mt-5">
          <ActionButton variant="outline" onClick={onClose}>Cancel</ActionButton>
          <ActionButton variant="amber" onClick={submit} disabled={saving || remarks.trim().length < 3}><Send size={12} /> Submit Decision</ActionButton>
        </div>
      </div>
    </div>
  );
}

function DashboardHome({ stats, apps, loading, onNavigate, onOpen, onDecision }) {
  const cards = [
    { key: "queue", label: "Pending EC Dockets", color: "text-purple-600", bg: "bg-purple-50", border: "#7c3aed", Icon: ClipboardList, nav: "dockets" },
    { key: "decided", label: "Decisions Recorded", color: "text-blue-600", bg: "bg-blue-50", border: "#2563eb", Icon: Award, nav: "dockets" },
    { key: "approved", label: "Recommended Approval", color: "text-green-600", bg: "bg-green-50", border: "#16a34a", Icon: CheckCircle2, nav: "dockets" },
    { key: "rejected", label: "Recommended Rejection", color: "text-red-500", bg: "bg-red-50", border: "#ef4444", Icon: XCircle, nav: "dockets" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {cards.map(({ key, label, color, bg, border, Icon, nav }) => (
          <button key={key} onClick={() => onNavigate(nav)} className="bg-white rounded-xl border-l-4 p-5 text-left hover:shadow-md transition-all shadow-sm" style={{ borderLeftColor: border }}>
            <div className="flex items-start justify-between"><div><div className="text-[11px] text-gray-500 font-medium mb-2">{label}</div><div className={`text-3xl font-bold leading-none ${color}`}>{stats?.[key] ?? 0}</div></div><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}><Icon size={16} className={color} /></div></div>
          </button>
        ))}
      </div>
      <SectionTitle title="Expert Committee Work Queue" subtitle="Applications forwarded by Nodal Officer for committee decision." />
      <AppTable rows={apps} loading={loading} onOpen={onOpen} onDecision={onDecision} empty="No cases pending with Expert Committee" />
    </>
  );
}

function DocketsPage({ onOpen, onDecision }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("queue");
  const load = () => {
    setLoading(true);
    api.get("/expert/applications", { params: { status: filter, limit: 100 } }).then((r) => setRows(r.data.data ?? [])).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);
  return (
    <>
      <SectionTitle title="Case Dockets" subtitle="Open applications, review dossier metadata, and record committee decisions." />
      <div className="flex flex-wrap gap-2 mb-4">
        {[["queue", "Pending"], ["decided", "Decided"], ["approved", "Approved"], ["rejected", "Rejected"], ["clarification", "Clarification"]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filter === key ? "bg-[#B45309] text-white border-[#B45309]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{label}</button>
        ))}
      </div>
      <AppTable rows={rows} loading={loading} onOpen={onOpen} onDecision={onDecision} />
    </>
  );
}

function AgendaPage({ onOpen, onDecision }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/expert/agenda").then((r) => setRows(r.data.data ?? [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  return (
    <>
      <SectionTitle title="Meeting Agenda" subtitle="Pending EC dockets ordered for committee meeting discussion." />
      <AppTable rows={rows} loading={loading} onOpen={onOpen} onDecision={onDecision} empty="No applications on the current EC agenda" />
    </>
  );
}

function DocketDetail({ app, onBack, onDecision }) {
  if (!app) return null;
  return (
    <>
      <div className="flex items-start justify-between mb-4"><SectionTitle title="Case Docket Detail" subtitle="Committee dossier summary and recorded EC decision context." /><ActionButton variant="outline" onClick={onBack}>Back</ActionButton></div>
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="font-mono text-[11px] text-gray-500">{app.reference_no}</div>
          <h3 className="text-lg font-bold text-black mt-1">{app.product_name}</h3>
          <p className="text-xs text-gray-500 mt-1">{app.organization_name} · {app.app_type}</p>
          <div className="grid sm:grid-cols-2 gap-4 text-xs mt-5">
            {[["Food Category", app.food_category], ["Kind of Business", app.kind_of_business], ["Risk Level", app.risk_level], ["Technical Officer", app.technical_officer_name], ["EC Status", app.ec_status], ["Submitted On", fmt(app.submitted_at)]].map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3"><div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">{label}</div><div className="font-semibold text-gray-800">{value ?? "-"}</div></div>
            ))}
          </div>
          <div className="mt-5"><div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">Applicant Address</div><p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{app.address ?? "-"}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-3">Decision Workspace</div>
          {app.ec_decision ? (
            <div className="space-y-3">
              <StatusBadge status={app.ec_decision} label={app.ec_decision} />
              <p className="text-xs text-gray-500">Recorded on {fmt(app.ec_decision_date)}</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{app.ec_remarks}</p>
            </div>
          ) : (
            <div className="space-y-3"><p className="text-xs text-gray-500">No EC decision has been recorded yet.</p><ActionButton variant="amber" onClick={() => onDecision(app)}><Send size={12} /> Record Decision</ActionButton></div>
          )}
        </div>
      </div>
    </>
  );
}

function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/expert/notifications").then((r) => setNotifs(r.data.data ?? [])).catch(() => setNotifs([])).finally(() => setLoading(false));
  }, []);
  const markRead = (id) => api.patch(`/expert/notifications/${id}/read`).then(() => setNotifs((ns) => ns.map((n) => n.id === id ? { ...n, is_read: true } : n))).catch(() => {});
  const markAll = () => api.patch("/expert/notifications/read-all").then(() => setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })))).catch(() => {});
  const unread = notifs.filter((n) => !n.is_read).length;
  return (
    <>
      <div className="flex items-center justify-between mb-4"><SectionTitle title="Notifications" />{unread > 0 && <ActionButton variant="outline" onClick={markAll}>Mark all read</ActionButton>}</div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : notifs.length === 0 ? <div className="py-12 text-center"><BellRing size={28} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm font-medium">No notifications</p></div> : notifs.map((n) => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50"><div className={`mt-1.5 w-2 h-2 rounded-full ${n.is_read ? "bg-gray-300" : "bg-[#B45309]"}`} /><div className="flex-1"><div className={`text-sm font-semibold ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>{n.title}</div><div className="text-xs text-gray-500 mt-0.5">{n.message}</div></div><div className="text-[10px] text-gray-400">{fmt(n.created_at)}</div></div>
        ))}
      </div>
    </>
  );
}

export default function ExpertDashboard() {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decisionApp, setDecisionApp] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    Promise.all([api.get("/expert/stats"), api.get("/expert/applications", { params: { status: "queue", limit: 20 } })])
      .then(([s, a]) => { setStats(s.data.stats ?? {}); setApps(a.data.data ?? []); })
      .catch(() => { setStats({}); setApps([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadDashboard(); }, []);

  const openApp = async (app) => {
    const r = await api.get(`/expert/applications/${app.id}`).catch(() => null);
    setSelected(r?.data?.data ?? app);
    setActiveKey("detail");
  };

  const content = () => {
    if (activeKey === "detail") return <DocketDetail app={selected} onBack={() => setActiveKey("dockets")} onDecision={setDecisionApp} />;
    if (activeKey === "dockets") return <DocketsPage onOpen={openApp} onDecision={setDecisionApp} />;
    if (activeKey === "agenda") return <AgendaPage onOpen={openApp} onDecision={setDecisionApp} />;
    if (activeKey === "notifications") return <Notifications />;
    return <DashboardHome stats={stats} apps={apps} loading={loading} onNavigate={setActiveKey} onOpen={openApp} onDecision={setDecisionApp} />;
  };

  return (
    <ExpertLayout activeKey={activeKey} onNavigate={setActiveKey}>
      <div className="p-5">{content()}</div>
      <DecisionModal app={decisionApp} onClose={() => setDecisionApp(null)} onDone={loadDashboard} />
    </ExpertLayout>
  );
}
