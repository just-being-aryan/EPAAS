import { useEffect, useMemo, useState } from "react";
import {
  Activity, Archive, Award, BellRing, CheckCircle2, ChevronRight, Clock,
  Download, FileSearch, MessageSquare, Search, Send, ShieldCheck, X, XCircle,
} from "lucide-react";
import TechnicalLayout from "./TechnicalLayout";
import api from "../../lib/api";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status, label }) {
  const map = {
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    scrutiny: "bg-blue-100 text-blue-700 border-blue-200",
    query: "bg-orange-100 text-orange-700 border-orange-200",
    ec: "bg-purple-100 text-purple-700 border-purple-200",
    withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
    appeal: "bg-indigo-100 text-indigo-700 border-indigo-200",
    review: "bg-teal-100 text-teal-700 border-teal-200",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{label ?? status ?? "-"}</span>;
}

function TH({ children }) {
  return <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50/80">{children}</th>;
}

function TD({ children, className = "" }) {
  return <td className={`px-3 py-2.5 border-b border-gray-50 align-middle text-xs ${className}`}>{children}</td>;
}

function EmptyTable({ cols = 8, label = "No applications found" }) {
  return <tr><td colSpan={cols} className="py-10 text-center text-gray-400 text-xs">{label}</td></tr>;
}

function FilterInput({ value, onChange, placeholder = "", type = "text" }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black w-full" />;
}

function FilterSelect({ value, onChange, children }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black w-full">{children}</select>;
}

function FL({ label, children }) {
  return <div className="min-w-[130px] flex-1"><label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">{label}</label>{children}</div>;
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-3">
      <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Technical Officer</div>
      <h2 className="text-lg font-bold text-black leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ActionButton({ children, onClick, variant = "primary", disabled }) {
  const cls = {
    primary: "bg-[#3D1C10] text-white hover:bg-[#2a120a]",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    blue: "bg-[#39B5E0] text-white hover:bg-[#249bc4]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${cls[variant]}`}>{children}</button>;
}

function Filters({ filters, setFilters, onSearch, onClear }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-end">
        <FL label="Application Ref. No."><FilterInput value={filters.reference_no} onChange={(v) => set("reference_no", v)} placeholder="2026-..." /></FL>
        <FL label="Company / Org"><FilterInput value={filters.q} onChange={(v) => set("q", v)} placeholder="Search..." /></FL>
        <FL label="Application Type">
          <FilterSelect value={filters.app_type} onChange={(v) => set("app_type", v)}>
            <option value="">All</option><option>NSF</option><option>CA</option><option>AA</option><option>rPET</option><option>Any Other</option>
          </FilterSelect>
        </FL>
        <FL label="From Date"><FilterInput type="date" value={filters.date_from} onChange={(v) => set("date_from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.date_to} onChange={(v) => set("date_to", v)} /></FL>
        <button onClick={onClear} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors flex-shrink-0"><X size={12} /> Clear</button>
        <ActionButton onClick={onSearch}><Search size={12} /> Search</ActionButton>
      </div>
    </div>
  );
}

function AppTable({ rows, loading, onOpen, onDraftQuery, onRecommend, empty = "No applications found" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead><tr><TH>Sr.</TH><TH>App. Ref. No.</TH><TH>Company</TH><TH>Product</TH><TH>Type</TH><TH>Received</TH><TH>Risk</TH><TH>Status</TH><TH>Action</TH></tr></thead>
            <tbody>
              {rows.length === 0 ? <EmptyTable cols={9} label={empty} /> : rows.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD>{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-gray-700">{app.reference_no ?? app.display_ref}</span></TD>
                  <TD className="font-medium text-black max-w-[160px] truncate">{app.organization_name ?? "-"}</TD>
                  <TD className="max-w-[140px] truncate text-gray-600">{app.product_name ?? "-"}</TD>
                  <TD>{app.app_type ?? "-"}</TD>
                  <TD className="text-gray-500 whitespace-nowrap">{fmt(app.submitted_at ?? app.created_at)}</TD>
                  <TD><StatusBadge status={app.risk_level === "High" ? "rejected" : app.risk_level === "Medium" ? "query" : "approved"} label={app.risk_level ?? "Unmarked"} /></TD>
                  <TD><StatusBadge status={app.status} /></TD>
                  <TD>
                    <div className="flex gap-1.5 flex-wrap">
                      <ActionButton onClick={() => onOpen(app)}><FileSearch size={12} /> Open</ActionButton>
                      <ActionButton variant="outline" onClick={() => onDraftQuery(app)}><MessageSquare size={12} /> Draft Query</ActionButton>
                      <ActionButton variant="blue" onClick={() => onRecommend(app)}><Send size={12} /> Recommend</ActionButton>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCards({ stats, onNavigate }) {
  const cards = [
    { key: "approved", label: "Applications Approved", color: "text-green-600", bg: "bg-green-50", border: "#16a34a", Icon: CheckCircle2, nav: "approved" },
    { key: "rejected", label: "Application Rejected", color: "text-red-500", bg: "bg-red-50", border: "#ef4444", Icon: XCircle, nav: "rejected" },
    { key: "ec", label: "Forwarded / Pending EC", color: "text-blue-600", bg: "bg-blue-50", border: "#2563eb", Icon: Award, nav: "reports_main" },
    { key: "withdrawn", label: "Application Withdrawn / Closed", color: "text-amber-600", bg: "bg-amber-50", border: "#d97706", Icon: Archive, nav: "withdrawn" },
    { key: "scrutiny", label: "Document Scrutiny", color: "text-teal-600", bg: "bg-teal-50", border: "#0d9488", Icon: Activity, nav: "doc_scrutiny" },
    { key: "query", label: "Drafted / Active Queries", color: "text-purple-600", bg: "bg-purple-50", border: "#7c3aed", Icon: MessageSquare, nav: "app_editing" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      {cards.map(({ key, label, color, bg, border, Icon, nav }) => (
        <button key={key} onClick={() => onNavigate(nav)} className="bg-white rounded-xl border-l-4 p-5 text-left hover:shadow-md transition-all cursor-pointer shadow-sm" style={{ borderLeftColor: border }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] text-gray-500 font-medium mb-2">{label}</div>
              <div className={`text-3xl font-bold leading-none ${color}`}>{stats?.[key] ?? 0}</div>
              <div className="text-[10px] text-gray-400 mt-2">Click to view details</div>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}><Icon size={16} className={color} /></div>
          </div>
        </button>
      ))}
    </div>
  );
}

function DashboardHome({ stats, apps, loading, onNavigate, onOpen, onDraftQuery, onRecommend }) {
  return (
    <>
      <StatCards stats={stats} onNavigate={onNavigate} />
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Assigned Applications</div>
        <ActionButton variant="outline" onClick={() => onNavigate("doc_scrutiny")}><ChevronRight size={12} /> View pending</ActionButton>
      </div>
      <AppTable rows={apps} loading={loading} onOpen={onOpen} onDraftQuery={onDraftQuery} onRecommend={onRecommend} empty="No applications assigned yet" />
    </>
  );
}

function Workbench({ app, onBack, onDraftQuery, onRecommend, onRefresh }) {
  const [risk, setRisk] = useState(app?.risk_level ?? "Low");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!app?.id) return;
    api.get(`/technical/workflow/${app.id}`).then((r) => setHistory(r.data.data ?? [])).catch(() => setHistory([]));
  }, [app?.id]);

  const saveRisk = async () => {
    setSaving(true);
    try {
      await api.patch(`/technical/applications/${app.id}/risk`, { risk_level: risk, remarks });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  if (!app) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="Application Workbench" subtitle="Review application data, classify risk, draft queries, and send recommendation to Nodal Officer." />
        <ActionButton variant="outline" onClick={onBack}>Back</ActionButton>
      </div>
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="font-mono text-[11px] text-gray-500">{app.reference_no ?? app.display_ref}</div>
              <h3 className="text-lg font-bold text-black mt-1">{app.product_name ?? "Application"}</h3>
              <p className="text-xs text-gray-500 mt-1">{app.organization_name ?? "-"} · {app.app_type ?? "-"}</p>
            </div>
            <StatusBadge status={app.status} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            {[
              ["Food Category", app.food_category],
              ["Kind of Business", app.kind_of_business],
              ["Applicant Email", app.contact_email],
              ["Mobile", app.mobile_number],
              ["FSSAI License", app.license_no],
              ["Submitted On", fmt(app.submitted_at)],
              ["Payment", app.payment_status],
              ["Current Stage", app.current_stage],
            ].map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">{label}</div>
                <div className="font-semibold text-gray-800">{value ?? "-"}</div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">Applicant Address</div>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{app.address ?? "-"}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Scrutiny Actions</div>
            <div className="space-y-3">
              <FL label="Risk Classification">
                <FilterSelect value={risk} onChange={setRisk}><option>Low</option><option>Medium</option><option>High</option></FilterSelect>
              </FL>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Scrutiny notes, document gaps, technical observations..." className="w-full min-h-24 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black resize-none" />
              <div className="flex gap-2 flex-wrap">
                <ActionButton onClick={saveRisk} disabled={saving}><ShieldCheck size={12} /> Save Risk</ActionButton>
                <ActionButton variant="outline" onClick={() => onDraftQuery(app)}><MessageSquare size={12} /> Draft Query</ActionButton>
                <ActionButton variant="blue" onClick={() => onRecommend(app)}><Send size={12} /> Recommend</ActionButton>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3">Workflow History</div>
            {history.length === 0 ? <p className="text-xs text-gray-400">No workflow history yet.</p> : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="border-l-2 border-[#39B5E0] pl-3">
                    <div className="text-xs font-bold text-gray-800">{h.action_type}</div>
                    <div className="text-[11px] text-gray-500">{fmt(h.created_at)} · {h.performed_by_name ?? "-"}</div>
                    {h.remarks && <div className="text-[11px] text-gray-600 mt-1">{h.remarks}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DraftQueryModal({ app, onClose, onDone }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  if (!app) return null;

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      await api.post(`/technical/applications/${app.id}/queries`, { query_text: text, due_date: due || undefined });
      onDone?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message ?? "Failed to draft query.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Draft Query</div>
            <h3 className="font-bold text-black">{app.reference_no ?? app.display_ref}</h3>
            <p className="text-xs text-gray-500">{app.organization_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{err}</div>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write the technical clarification/query for Nodal Officer approval..." className="w-full min-h-36 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-black resize-none" />
        <div className="mt-3"><FL label="Due Date"><FilterInput type="date" value={due} onChange={setDue} /></FL></div>
        <div className="flex justify-end gap-2 mt-5">
          <ActionButton variant="outline" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={submit} disabled={saving || text.trim().length < 10}><Send size={12} /> Submit to Nodal</ActionButton>
        </div>
      </div>
    </div>
  );
}

function RecommendationModal({ app, onClose, onDone }) {
  const [recommendation, setRecommendation] = useState("ForwardToEC");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  if (!app) return null;

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      await api.post(`/technical/applications/${app.id}/recommendation`, { recommendation, remarks });
      onDone?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message ?? "Failed to submit recommendation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Technical Recommendation</div>
            <h3 className="font-bold text-black">{app.reference_no ?? app.display_ref}</h3>
            <p className="text-xs text-gray-500">{app.product_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{err}</div>}
        <FL label="Recommendation">
          <FilterSelect value={recommendation} onChange={setRecommendation}>
            <option value="ForwardToEC">Forward to Expert Committee</option>
            <option value="Approve">Recommend Approval</option>
            <option value="Reject">Recommend Rejection</option>
            <option value="Clarification">Seek Clarification</option>
          </FilterSelect>
        </FL>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Technical observations and reasons..." className="w-full min-h-32 mt-3 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-black resize-none" />
        <div className="flex justify-end gap-2 mt-5">
          <ActionButton variant="outline" onClick={onClose}>Cancel</ActionButton>
          <ActionButton variant="blue" onClick={submit} disabled={saving || remarks.trim().length < 3}><Send size={12} /> Submit</ActionButton>
        </div>
      </div>
    </div>
  );
}

function ApplicationsPage({ title, subtitle, status, onOpen, onDraftQuery, onRecommend }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ reference_no: "", q: "", app_type: "", date_from: "", date_to: "" });

  const load = () => {
    setLoading(true);
    const params = { limit: 100, ...(status ? { status } : {}) };
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    api.get("/technical/applications", { params })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);
  const clear = () => setFilters({ reference_no: "", q: "", app_type: "", date_from: "", date_to: "" });

  return (
    <>
      <SectionTitle title={title} subtitle={subtitle} />
      <Filters filters={filters} setFilters={setFilters} onSearch={load} onClear={clear} />
      <AppTable rows={rows} loading={loading} onOpen={onOpen} onDraftQuery={onDraftQuery} onRecommend={onRecommend} />
    </>
  );
}

function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/technical/reports/status")
      .then((r) => { setRows(r.data.data ?? []); setSummary(r.data.summary ?? []); })
      .catch(() => { setRows([]); setSummary([]); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SectionTitle title="Reports" subtitle="Application status summary for cases assigned to you." />
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        {summary.map((s, i) => (
          <div key={`${s.status}-${s.app_type}-${i}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{s.app_type}</div>
            <div className="mt-2 flex items-center justify-between">
              <StatusBadge status={s.status} />
              <div className="text-2xl font-bold text-black">{s.count}</div>
            </div>
          </div>
        ))}
      </div>
      <AppTable rows={rows} loading={loading} onOpen={() => {}} onDraftQuery={() => {}} onRecommend={() => {}} />
    </>
  );
}

function ExtensionPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/technical/extensions", { params: { status: "Pending" } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    await api.patch(`/technical/extensions/${id}`, { action });
    load();
  };

  return (
    <>
      <SectionTitle title="Extension of Time" subtitle="Review applicant requests for additional time against active technical queries." />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead><tr><TH>App. Ref.</TH><TH>Company</TH><TH>Reason</TH><TH>Requested Date</TH><TH>New Deadline</TH><TH>Status</TH><TH>Action</TH></tr></thead>
              <tbody>
                {rows.length === 0 ? <EmptyTable cols={7} label="No pending extension requests" /> : rows.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30">
                    <TD>{r.reference_no}</TD><TD className="font-medium text-black">{r.organization_name}</TD><TD className="max-w-[260px] truncate">{r.reason}</TD>
                    <TD>{fmt(r.requested_date)}</TD><TD>{fmt(r.new_due_date)}</TD><TD><StatusBadge status="pending" label={r.status} /></TD>
                    <TD><div className="flex gap-1.5"><ActionButton onClick={() => act(r.id, "approve")}>Approve</ActionButton><ActionButton variant="danger" onClick={() => act(r.id, "reject")}>Reject</ActionButton></div></TD>
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

function DraftedQueriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/technical/queries")
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <SectionTitle
        title="Application with Editing / Clarification"
        subtitle="Queries you drafted and sent to Nodal Officer for approval before dispatch to Applicant."
      />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead><tr><TH>App. Ref.</TH><TH>Company</TH><TH>Product</TH><TH>Query</TH><TH>Status</TH><TH>Due Date</TH><TH>Created</TH></tr></thead>
              <tbody>
                {rows.length === 0 ? <EmptyTable cols={7} label="No drafted queries yet" /> : rows.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-50/30">
                    <TD><span className="font-mono text-[10px] text-gray-700">{q.reference_no}</span></TD>
                    <TD className="font-medium text-black max-w-[150px] truncate">{q.organization_name}</TD>
                    <TD className="max-w-[140px] truncate">{q.product_name}</TD>
                    <TD className="max-w-[320px] truncate text-gray-600">{q.query_text}</TD>
                    <TD><StatusBadge status={q.status === "Draft" ? "pending" : q.status === "Sent" ? "query" : "approved"} label={q.status} /></TD>
                    <TD>{fmt(q.due_date)}</TD>
                    <TD>{fmt(q.created_at)}</TD>
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

function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/technical/notifications")
      .then((r) => setNotifs(r.data.data ?? []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    api.patch(`/technical/notifications/${id}/read`).then(() => {
      setNotifs((ns) => ns.map((n) => n.id === id ? { ...n, is_read: true } : n));
    }).catch(() => {});
  };

  const markAllRead = () => {
    api.patch("/technical/notifications/read-all").then(() => setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })))).catch(() => {});
  };

  const unread = notifs.filter((n) => !n.is_read).length;
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="Notifications" />
        {unread > 0 && <ActionButton variant="outline" onClick={markAllRead}>Mark all read</ActionButton>}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading...</div> : notifs.length === 0 ? (
          <div className="py-12 text-center"><BellRing size={28} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm font-medium">No notifications</p></div>
        ) : notifs.map((n) => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? "bg-gray-300" : "bg-teal-500"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>{n.title ?? "Notification"}</div>
              <div className="text-xs text-gray-500 mt-0.5">{n.message ?? ""}</div>
            </div>
            <div className="text-[10px] text-gray-400 whitespace-nowrap">{fmt(n.created_at)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function TechnicalDashboard() {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [queryApp, setQueryApp] = useState(null);
  const [recommendApp, setRecommendApp] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    Promise.all([
      api.get("/technical/stats"),
      api.get("/technical/applications", { params: { limit: 20 } }),
    ]).then(([s, a]) => {
      setStats(s.data.stats ?? {});
      setApps(a.data.data ?? []);
    }).catch(() => {
      setStats({});
      setApps([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const openApp = async (app) => {
    const r = await api.get(`/technical/applications/${app.id}`).catch(() => null);
    setSelected(r?.data?.data ?? app);
    setActiveKey("workbench");
  };

  const pageConfig = useMemo(() => ({
    doc_scrutiny: ["Document Scrutinization", "Review assigned applications for document completeness and technical risk.", "scrutiny"],
    granted: ["Granted Approval", "Applications forwarded for Expert Committee review.", "ec"],
    app_editing: ["Application Forwarded for Editing / Clarification", "Applications with active or drafted technical queries.", "query"],
    withdrawal: ["Withdrawal of Approval", "Withdrawn or closed applications assigned to your desk.", "withdrawn"],
    approved: ["Approved Applications", "Application based report for approvals.", "approved"],
    rejected: ["Rejected Applications", "Application based report for rejections.", "rejected"],
    withdrawn: ["Withdrawn by Applicant", "Application based report for withdrawn or closed cases.", "withdrawn"],
    appeal: ["Application for Appeal", "Appeal cases assigned to your desk.", "appeal"],
    review: ["Application for Review", "Review cases assigned to your desk.", "review"],
    appeal_review: ["Appeal and Review", "Combined appeal and review work queue.", "appeal"],
    search: ["Search Console", "Search across applications assigned to you.", null],
  }), []);

  const renderContent = () => {
    if (activeKey === "workbench") return <Workbench app={selected} onBack={() => setActiveKey("dashboard")} onDraftQuery={setQueryApp} onRecommend={setRecommendApp} onRefresh={loadDashboard} />;
    if (activeKey === "reports_main") return <ReportsPage />;
    if (activeKey === "extension") return <ExtensionPage />;
    if (activeKey === "notifications") return <Notifications />;
    if (activeKey === "app_editing") return <DraftedQueriesPage />;
    if (pageConfig[activeKey]) {
      const [title, subtitle, status] = pageConfig[activeKey];
      return <ApplicationsPage title={title} subtitle={subtitle} status={status} onOpen={openApp} onDraftQuery={setQueryApp} onRecommend={setRecommendApp} />;
    }
    return <DashboardHome stats={stats} apps={apps} loading={loading} onNavigate={setActiveKey} onOpen={openApp} onDraftQuery={setQueryApp} onRecommend={setRecommendApp} />;
  };

  return (
    <TechnicalLayout activeKey={activeKey} onNavigate={setActiveKey}>
      <div className="p-5">
        {renderContent()}
      </div>
      <DraftQueryModal app={queryApp} onClose={() => setQueryApp(null)} onDone={loadDashboard} />
      <RecommendationModal app={recommendApp} onClose={() => setRecommendApp(null)} onDone={loadDashboard} />
    </TechnicalLayout>
  );
}
