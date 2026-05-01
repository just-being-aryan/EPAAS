import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Plus, AlertTriangle, ArrowRight, Search, Download, X,
  Folder, ClipboardList, CheckCircle2, RefreshCcw, XCircle, Award,
} from "lucide-react";
import ApplicantLayout, { useApplicantUser } from "./Layout";
import api from "../../lib/api";

// ── Config ────────────────────────────────────────────────────────────────────

const BINS = [
  { key: null,        label: "Click to View All Applications",                  countKey: "total",     Icon: Folder,       numColor: "text-amber-600",  iconBg: "bg-amber-50",  activeBg: "bg-[#5FC7E9]" },
  { key: "incomplete",label: "Incomplete Application",                           countKey: "incomplete", Icon: ClipboardList,numColor: "text-amber-500",  iconBg: "bg-amber-50",  activeBg: "bg-[#5FC7E9]" },
  { key: "submitted", label: "Submitted Applications with Successful Payment",   countKey: "submitted",  Icon: CheckCircle2, numColor: "text-teal-600",   iconBg: "bg-teal-50",   activeBg: "bg-[#5FC7E9]" },
  { key: "reverted",  label: "Reverted Application by Authority",                countKey: "reverted",   Icon: RefreshCcw,   numColor: "text-yellow-500", iconBg: "bg-yellow-50", activeBg: "bg-[#5FC7E9]" },
  { key: "rejected",  label: "Rejected Application",                             countKey: "rejected",   Icon: XCircle,      numColor: "text-red-500",    iconBg: "bg-red-50",    activeBg: "bg-[#5FC7E9]" },
  { key: "approved",  label: "Approval Issued",                                  countKey: "approved",   Icon: Award,        numColor: "text-green-600",  iconBg: "bg-green-50",  activeBg: "bg-[#5FC7E9]" },
];

const APP_TYPE_OPTIONS = [
  { value: "",          label: "All App. Types" },
  { value: "NSF",       label: "Non Specified Food (NSF)" },
  { value: "CA",        label: "Claim Approval (CA)" },
  { value: "AA",        label: "Ayurveda Ahara (AA)" },
  { value: "rPET",      label: "rPET" },
  { value: "Any Other", label: "Any Other" },
];

const FOOD_CATS = [
  "All Food Categories", "Dairy & Products", "Beverages", "Bakery & Products",
  "Fortified Foods", "Herbal Products", "Snack Foods", "Health Supplements", "Packaged Foods",
];

const APP_TYPE_LABEL = { NSF: "Non Specified Food", CA: "Claim Approval", AA: "Ayurveda Ahara", rPET: "rPET", "Any Other": "Any Other" };
const APP_TYPE_COLOR = { NSF: "text-gray-700", CA: "text-blue-600 font-medium", AA: "text-violet-600 font-medium", rPET: "text-teal-600 font-medium", "Any Other": "text-orange-600" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const MAP = {
    pending:  { label: "Pending",        cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    scrutiny: { label: "Under Scrutiny", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    ec:       { label: "With EC",        cls: "bg-teal-100 text-teal-700 border-teal-200" },
    query:    { label: "Query Raised",   cls: "bg-orange-500 text-white border-orange-500" },
    approved: { label: "Approved",       cls: "bg-green-600 text-white border-green-600" },
    rejected: { label: "Rejected",       cls: "bg-red-600 text-white border-red-600" },
    draft:    { label: "Draft",          cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const s = MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function Btn({ children, variant = "dark", onClick }) {
  const V = { dark: "bg-black hover:bg-white hover:text-black border border-black text-white", outline: "border border-black text-black hover:bg-black hover:text-white", amber: "border border-black text-black hover:bg-black hover:text-white" };
  return <button onClick={onClick} className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${V[variant]}`}>{children}</button>;
}

function TH({ children, className = "" }) {
  return <th className={`text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50 ${className}`}>{children}</th>;
}
function TD({ children, className = "" }) {
  return <td className={`px-4 py-3 border-b border-gray-50 align-middle ${className}`}>{children}</td>;
}

function TableHead({ bin }) {
  const base = <><TH className="w-10">SR.</TH><TH>Company Name</TH><TH>Reference No.</TH></>;
  if (bin === null)       return <tr>{base}<TH>Application Type</TH><TH>Status</TH><TH>Last Updated On</TH><TH>Action</TH></tr>;
  if (bin === "incomplete") return <tr>{base}<TH>Address</TH><TH>Application Type</TH><TH>Food Category</TH><TH>Last Updated On</TH><TH>Action</TH></tr>;
  if (bin === "submitted")  return <tr>{base}<TH>Address</TH><TH>Application Type</TH><TH>Food Category</TH><TH>Last Updated On</TH><TH>Status</TH><TH>Action</TH></tr>;
  if (bin === "reverted")   return <tr>{base}<TH>Address</TH><TH>Application Type</TH><TH>Food Category</TH><TH>Last Updated On</TH><TH>Status</TH><TH>Action</TH><TH>Query / Ext. Time</TH></tr>;
  if (bin === "rejected")   return <tr>{base}<TH>Address</TH><TH>Application Type</TH><TH>Food Category</TH><TH>Rejected Date</TH><TH>Status</TH><TH>Action</TH></tr>;
  if (bin === "approved")   return <tr>{base}<TH>Address</TH><TH>Application Type</TH><TH>Food Category</TH><TH>Issued Date</TH><TH>Status</TH><TH>Action</TH></tr>;
  return null;
}

function AppRow({ app, idx, bin, navigate }) {
  const typeLabel = APP_TYPE_LABEL[app.app_type] ?? app.app_type;
  const typeColor = APP_TYPE_COLOR[app.app_type] ?? "text-gray-700";
  const rowCls = "hover:bg-blue-50/40 transition-colors";
  const lastUpdated = fmt(app.updated_at || app.submitted_at || app.created_at);

  const n   = <TD className="text-gray-400 text-center">{idx + 1}</TD>;
  const co  = <TD className="font-medium text-black max-w-[160px]">{app.organization_name ?? "—"}</TD>;
  const ref = <TD><span className="font-mono text-gray-700 text-[11px]">{app.display_ref}</span></TD>;
  const adr = <TD className="text-gray-500 max-w-[140px] truncate">{app.address ?? "—"}</TD>;
  const typ = <TD className={typeColor}>{typeLabel}</TD>;
  const cat = <TD className="text-gray-500">{app.food_category ?? "—"}</TD>;

  if (bin === null) return (
    <tr className={rowCls}>{n}{co}{ref}{typ}<TD><StatusBadge status={app.status} /></TD><TD className="text-gray-500">{lastUpdated}</TD>
      <TD><Btn variant="outline" onClick={() => navigate(`/applicant/applications/${app.id}`)}>View</Btn></TD>
    </tr>
  );
  if (bin === "incomplete") return (
    <tr className={rowCls}>{n}{co}{ref}{adr}{typ}{cat}<TD className="text-gray-500">{fmt(app.created_at)}</TD>
      <TD><Btn variant="dark" onClick={() => navigate(`/applicant/applications/${app.id}/edit`)}>Edit Draft</Btn></TD>
    </tr>
  );
  if (bin === "submitted") return (
    <tr className={rowCls}>{n}{co}{ref}{adr}{typ}{cat}<TD className="text-gray-500">{fmt(app.submitted_at)}</TD>
      <TD><StatusBadge status={app.status} /></TD>
      <TD><Btn variant="outline" onClick={() => navigate(`/applicant/applications/${app.id}`)}>View</Btn></TD>
    </tr>
  );
  if (bin === "reverted") return (
    <tr className={rowCls}>{n}{co}{ref}{adr}{typ}{cat}<TD className="text-gray-500">{lastUpdated}</TD>
      <TD><StatusBadge status="query" /></TD>
      <TD><Btn variant="dark" onClick={() => navigate(`/applicant/applications/${app.id}/respond`)}>Respond</Btn></TD>
      <TD><div className="flex gap-1.5"><Btn variant="outline">View Query</Btn><Btn variant="amber">Req. Extension</Btn></div></TD>
    </tr>
  );
  if (bin === "rejected") return (
    <tr className={rowCls}>{n}{co}{ref}{adr}{typ}{cat}<TD className="text-gray-500">{fmt(app.decision_at)}</TD>
      <TD><StatusBadge status="rejected" /></TD>
      <TD><div className="flex gap-1.5 flex-wrap"><Btn variant="outline">View Receipt</Btn><Btn variant="outline">View History</Btn><Btn variant="outline">Send Mail</Btn><Btn variant="amber">Appeal</Btn><Btn variant="amber">Review</Btn></div></TD>
    </tr>
  );
  if (bin === "approved") return (
    <tr className={rowCls}>{n}{co}{ref}{adr}{typ}{cat}<TD className="text-gray-500">{fmt(app.decision_at)}</TD>
      <TD><StatusBadge status="approved" /></TD>
      <TD><div className="flex gap-1.5"><Btn variant="outline">View Receipt</Btn><Btn variant="outline">View History</Btn><Btn variant="outline">Send Mail</Btn></div></TD>
    </tr>
  );
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const navigate = useNavigate();
  const { user } = useApplicantUser();
  const [stats, setStats]         = useState(null);
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [activeBin, setActiveBin] = useState(null);
  const [topSearch, setTopSearch] = useState("");
  const [filters, setFilters]     = useState({ app_type: "", food_category: "", reference_no: "", date_from: "", date_to: "" });

  useEffect(() => {
    api.get("/applications/stats").then((r) => setStats(r.data.stats)).catch(() => {});
  }, []);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (activeBin)            params.bin           = activeBin;
      if (filters.app_type)     params.app_type      = filters.app_type;
      if (filters.food_category)params.food_category = filters.food_category;
      if (filters.reference_no) params.reference_no  = filters.reference_no;
      if (filters.date_from)    params.date_from     = filters.date_from;
      if (filters.date_to)      params.date_to       = filters.date_to;
      const res = await api.get("/applications", { params });
      setApps(res.data.data);
    } catch { /**/ } finally { setLoading(false); }
  }, [activeBin, filters]);

  useEffect(() => { if (user) fetchApps(); }, [fetchApps, user]);

  const clearFilters = () => { setFilters({ app_type: "", food_category: "", reference_no: "", date_from: "", date_to: "" }); setTopSearch(""); };

  const displayed = topSearch
    ? apps.filter((a) => a.display_ref?.toLowerCase().includes(topSearch.toLowerCase()) || a.organization_name?.toLowerCase().includes(topSearch.toLowerCase()))
    : apps;

  const activeCfg = BINS.find((b) => b.key === activeBin) ?? BINS[0];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="text-white mx-4 mt-4 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ backgroundColor: "#5FC7E9" }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/70 mb-2 pt-2 font-medium">FSSAI E-PAAS · APPLICANT PORTAL</div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Welcome back, {user?.username ?? "Applicant"}</h2>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link to="/applicant/applications/new" className="flex items-center gap-1.5 bg-black text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white hover:text-black border border-black transition-colors">
            <Plus size={14} /> New Application
          </Link>
          <Link to="/applicant/profile" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            My Profile
          </Link>
        </div>
      </div>

      {/* Alert */}
      {(stats?.reverted ?? 0) > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">Action Required on {stats.reverted} Application{stats.reverted > 1 ? "s" : ""}</p>
              <p className="text-amber-700 text-xs mt-0.5">The authority has reverted your application(s) with queries. Please respond before the deadline.</p>
            </div>
          </div>
          <button onClick={() => setActiveBin("reverted")} className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
            Respond Now <ArrowRight size={12} />
          </button>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {BINS.map((bin) => {
            const isActive = activeBin === bin.key;
            const Icon = bin.Icon;
            return (
              <button key={bin.countKey} onClick={() => setActiveBin(bin.key)}
                className={`rounded-xl p-4 text-left transition-all duration-150 shadow-sm cursor-pointer ${isActive ? `${bin.activeBg} text-white` : "bg-white border border-gray-100 hover:border-gray-300 hover:shadow"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isActive ? "bg-white/20" : bin.iconBg}`}>
                  <Icon size={18} className={isActive ? "text-white" : bin.numColor} />
                </div>
                <div className={`text-2xl font-bold leading-none ${isActive ? "text-white" : bin.numColor}`}>{stats?.[bin.countKey] ?? "—"}</div>
                <div className={`text-[10px] font-medium mt-1.5 leading-tight ${isActive ? "text-white/80" : "text-gray-500"}`}>{bin.label}</div>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-black text-sm">{activeCfg.label}</h3>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                <span>{displayed.length} record{displayed.length !== 1 ? "s" : ""}</span>
                {activeBin === "reverted" && displayed.length > 0 && <span className="text-amber-600 font-medium">⚠ Response required</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search reference, company..." value={topSearch} onChange={(e) => setTopSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 focus:outline-none focus:border-black" />
              </div>
              <button className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                <Download size={12} /> Export
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-semibold text-gray-500">FILTERS:</span>
            <select value={activeBin ?? ""} onChange={(e) => setActiveBin(e.target.value || null)}
              className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-black max-w-[210px]">
              {BINS.map((b) => <option key={b.countKey} value={b.key ?? ""}>{b.label}</option>)}
            </select>
            <select value={filters.app_type} onChange={(e) => setFilters((f) => ({ ...f, app_type: e.target.value }))}
              className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-black">
              {APP_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filters.food_category} onChange={(e) => setFilters((f) => ({ ...f, food_category: e.target.value }))}
              className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-black">
              {FOOD_CATS.map((c) => <option key={c} value={c === "All Food Categories" ? "" : c}>{c}</option>)}
            </select>
            <select disabled className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-gray-50 text-gray-400 cursor-not-allowed"><option>All Statuses</option></select>
            <input type="text" placeholder="Reference No." value={filters.reference_no} onChange={(e) => setFilters((f) => ({ ...f, reference_no: e.target.value }))}
              className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-black w-28" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">From</span>
              <input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-black" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">To</span>
              <input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-black" />
            </div>
            <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-600 transition-colors"><X size={12} /> Clear</button>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="py-14 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No applications found</p>
              {activeBin === null && (
                <Link to="/applicant/applications/new" className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white hover:text-black border border-black mt-4 transition-colors">
                  <Plus size={13} /> New Application
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead><TableHead bin={activeBin} /></thead>
                <tbody>{displayed.map((app, idx) => <AppRow key={app.id} app={app} idx={idx} bin={activeBin} navigate={navigate} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ApplicantDashboard() {
  return (
    <ApplicantLayout
      pageTitle="Dashboard"
      headerRight={
        <Link to="/applicant/applications/new" className="flex items-center gap-1.5 bg-black hover:bg-white hover:text-black border border-black text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> New Application
        </Link>
      }
    >
      <DashboardContent />
    </ApplicantLayout>
  );
}
