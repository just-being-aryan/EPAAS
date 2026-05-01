import { useState, useEffect } from "react";
import {
  CheckCircle2, XCircle, Award, Archive, MessageSquare, Activity,
  Download, X, BellRing, Search, ChevronRight,
} from "lucide-react";
import NodalLayout from "./NodalLayout";
import api from "../../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status, label }) {
  const MAP = {
    approved:  "bg-green-100 text-green-700 border-green-200",
    rejected:  "bg-red-100 text-red-700 border-red-200",
    pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
    scrutiny:  "bg-blue-100 text-blue-700 border-blue-200",
    appeal:    "bg-purple-100 text-purple-700 border-purple-200",
    review:    "bg-indigo-100 text-indigo-700 border-indigo-200",
    withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
    query:     "bg-orange-100 text-orange-700 border-orange-200",
  };
  const cls = MAP[status] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${cls}`}>
      {label ?? status}
    </span>
  );
}

function TH({ children, className = "" }) {
  return (
    <th className={`text-left px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50/80 ${className}`}>
      {children}
    </th>
  );
}
function TD({ children, className = "" }) {
  return (
    <td className={`px-3 py-2.5 border-b border-gray-50 align-middle text-xs ${className}`}>
      {children}
    </td>
  );
}

function FilterInput({ placeholder = "", value, onChange, type = "text" }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black w-full"
    />
  );
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black w-full"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

function FL({ label, children }) {
  return (
    <div className="min-w-[120px] flex-1">
      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

function FilterBar({ children, onClear }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-end">
        {children}
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors flex-shrink-0"
        >
          <X size={12} /> Clear
        </button>
      </div>
    </div>
  );
}

function EmptyTable({ cols }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-gray-400 text-xs">No applications found</td>
    </tr>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TILES = [
  { key: "tile_dashboard",     label: "Click to View Dashboard",      activeBg: "#3D1C10" },
  { key: "tile_pending",       label: "Click to View Pending Actions", activeBg: "#F97316", countKey: "pending" },
  { key: "tile_notifications", label: "Click to View Notifications",   activeBg: "#0D6B7B", countKey: "notif" },
];

const STATES    = ["Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Maharashtra", "Tamil Nadu", "Uttar Pradesh"];
const APP_TYPES = ["NSF", "CA", "AA", "rPET", "Any Other"];
const BIZ_TYPES = ["Manufacturer", "Importer", "Retailer", "Wholesaler", "Distributor"];
const W_REASONS = ["Non-compliance", "Business Closure", "Product Discontinuation", "Voluntary"];

// ── Dashboard Overview ────────────────────────────────────────────────────────

const STAT_CARDS = [
  { key: "approved",   label: "Applications Approved",           color: "text-green-600",  bg: "bg-green-50",  borderColor: "#16a34a", icon: CheckCircle2 },
  { key: "rejected",   label: "Application Rejected",            color: "text-red-500",    bg: "bg-red-50",    borderColor: "#ef4444", icon: XCircle      },
  { key: "pms",        label: "Application Approved with PMS",   color: "text-blue-600",   bg: "bg-blue-50",   borderColor: "#2563eb", icon: Award        },
  { key: "withdrawn",  label: "Application Withdrawn / Closed",  color: "text-amber-600",  bg: "bg-amber-50",  borderColor: "#d97706", icon: Archive      },
  { key: "app_status", label: "Application Status",              color: "text-teal-600",   bg: "bg-teal-50",   borderColor: "#0d9488", icon: Activity     },
  { key: "appeal",     label: "Application for Appeal / Review", color: "text-purple-600", bg: "bg-purple-50", borderColor: "#7c3aed", icon: MessageSquare },
];

function DashboardOverview({ stats, apps, loading, onSectionNav }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {STAT_CARDS.map(({ key, label, color, bg, borderColor, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSectionNav(key === "app_status" ? "reports_main" : key === "pms" ? "approved" : key)}
            className="bg-white rounded-xl border-l-4 p-5 text-left hover:shadow-md transition-all cursor-pointer shadow-sm"
            style={{ borderLeftColor: borderColor }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] text-gray-500 font-medium mb-2">{label}</div>
                <div className={`text-3xl font-bold leading-none ${color}`}>
                  {key === "app_status"
                    ? <span className="text-sm font-semibold text-gray-500">View details —</span>
                    : (stats?.[key] ?? "—")}
                </div>
                <div className="text-[10px] text-gray-400 mt-2">Click to view details</div>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-black text-sm uppercase tracking-wide">Recent Applications</h3>
          <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            <Download size={12} /> View pending →
          </button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr>
                  <TH>App No.</TH><TH>Company</TH><TH>Product</TH><TH>Type</TH>
                  <TH>Received</TH><TH>IO Assigned</TH><TH>Status</TH>
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">No applications found</td></tr>
                ) : apps.map((app, i) => (
                  <tr key={app.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                    <TD><span className="font-mono text-[10px] text-gray-600">{app.reference_no ?? "—"}</span></TD>
                    <TD className="font-medium text-black max-w-[140px] truncate">{app.organization_name ?? "—"}</TD>
                    <TD className="max-w-[120px] truncate text-gray-600">{app.product_name ?? app.food_category ?? "—"}</TD>
                    <TD>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${app.app_type === "Appeal" ? "bg-blue-600 text-white" : app.app_type === "Review" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                        {app.app_type ?? "New"}
                      </span>
                    </TD>
                    <TD className="text-gray-500 whitespace-nowrap">{fmt(app.submitted_at ?? app.created_at)}</TD>
                    <TD className="text-gray-500">{app.assigned_officer_name ?? "—"}</TD>
                    <TD><StatusBadge status={app.status} /></TD>
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

// ── Pending Actions (tile view, 4 sub-tabs) ───────────────────────────────────

const PENDING_TABS = [
  { key: "doc_scrutiny",  label: "Document Scrutinization",    count: 18 },
  { key: "app_editing",   label: "Application with Editing",   count: 7  },
  { key: "withdrawal",    label: "Withdrawal of Approval",     count: 4  },
  { key: "appeal_review", label: "Application for Appeal/Review", count: 6 },
];

function PendingTabBar({ activeTab, setActiveTab }) {
  return (
    <div className="flex flex-wrap gap-0 mb-5 border-b border-gray-200">
      {PENDING_TABS.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2"
            style={isActive
              ? { borderBottomColor: "#3D1C10", color: "#3D1C10" }
              : { borderBottomColor: "transparent", color: "#6b7280" }}
          >
            {t.label}
            <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isActive ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}>
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Shared table for Doc Scrutinization ──────────────────────────────────────

function DocScrutinizationTable({ rows, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr>
              <TH className="w-10">Sr. No.</TH>
              <TH>App. Ref. No. / UID</TH>
              <TH>App. Type</TH>
              <TH>Company / Org.</TH>
              <TH>Product Applied For</TH>
              <TH>Received On</TH>
              <TH>Edited</TH>
              <TH>Days Remaining</TH>
              <TH>Action</TH>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-10 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <EmptyTable cols={9} />
            ) : rows.map((app, i) => (
              <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                <TD className="text-center text-gray-400">{i + 1}</TD>
                <TD><span className="font-mono text-[10px] text-blue-600">{app.reference_no ?? "—"}</span></TD>
                <TD>{app.app_type ?? "—"}</TD>
                <TD className="max-w-[160px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                <TD className="max-w-[140px] truncate">{app.product_name ?? "—"}</TD>
                <TD className="whitespace-nowrap">{fmt(app.submitted_at)}</TD>
                <TD>—</TD>
                <TD><span className="font-bold text-amber-600">{app.days_remaining ?? "—"}</span></TD>
                <TD>
                  <button className="px-2.5 py-1 text-[10px] font-bold border border-black text-black hover:bg-black hover:text-white rounded transition-colors">Review</button>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Processing Sub-Pages ──────────────────────────────────────────────────────

function DocScrutinization() {
  const [filters, setFilters] = useState({ ref: "", company: "", state: "", from: "", to: "", bizType: "", appType: "", appFilter: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ ref: "", company: "", state: "", from: "", to: "", bizType: "", appType: "", appFilter: "" });

  useEffect(() => {
    setLoading(true);
    api.get("/nodal/applications", { params: { status: "scrutiny", limit: 100 } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = rows.filter((r) => {
    if (filters.ref && !r.reference_no?.toLowerCase().includes(filters.ref.toLowerCase())) return false;
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.appType && r.app_type !== filters.appType) return false;
    return true;
  });

  return (
    <>
      <FilterBar onClear={clear}>
        <FL label="Application Ref. No."><FilterInput placeholder="EPAAS-..." value={filters.ref} onChange={(v) => set("ref", v)} /></FL>
        <FL label="Company / Org Name"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="State"><FilterSelect value={filters.state} onChange={(v) => set("state", v)} options={STATES} placeholder="All" /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
        <FL label="Kind of Business"><FilterSelect value={filters.bizType} onChange={(v) => set("bizType", v)} options={BIZ_TYPES} placeholder="All" /></FL>
        <FL label="Application Type"><FilterSelect value={filters.appType} onChange={(v) => set("appType", v)} options={APP_TYPES} placeholder="All" /></FL>
        <FL label="Application Filter"><FilterInput placeholder="Filter..." value={filters.appFilter} onChange={(v) => set("appFilter", v)} /></FL>
      </FilterBar>
      <DocScrutinizationTable rows={displayed} loading={loading} />
    </>
  );
}

function GrantedApproval() {
  const [filters, setFilters] = useState({ ref: "", approvalNo: "", company: "", appType: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ ref: "", approvalNo: "", company: "", appType: "", from: "", to: "" });

  useEffect(() => {
    setLoading(true);
    api.get("/nodal/applications", { params: { status: "approved", limit: 200 } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = rows.filter((r) => {
    if (filters.ref && !r.reference_no?.toLowerCase().includes(filters.ref.toLowerCase())) return false;
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.appType && r.app_type !== filters.appType) return false;
    return true;
  });

  return (
    <>
      <FilterBar onClear={clear}>
        <FL label="App Ref. No."><FilterInput placeholder="EPAAS-..." value={filters.ref} onChange={(v) => set("ref", v)} /></FL>
        <FL label="Approval No."><FilterInput placeholder="APPR-..." value={filters.approvalNo} onChange={(v) => set("approvalNo", v)} /></FL>
        <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="Application Type"><FilterSelect value={filters.appType} onChange={(v) => set("appType", v)} options={APP_TYPES} placeholder="All" /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
      </FilterBar>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>Application No.</TH>
                <TH>Approval No.</TH>
                <TH>Company / Org.</TH>
                <TH>Product</TH>
                <TH>EC Number</TH>
                <TH>EC Status</TH>
                <TH>Date of Issue (Form 2)</TH>
                <TH>Final Status</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <EmptyTable cols={9} />
              ) : displayed.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{app.reference_no ?? "—"}</span></TD>
                  <TD className="text-gray-500 font-mono text-[10px]">—</TD>
                  <TD className="max-w-[160px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate">{app.product_name ?? "—"}</TD>
                  <TD className="font-mono text-[10px] text-gray-500">—</TD>
                  <TD>—</TD>
                  <TD className="whitespace-nowrap">{fmt(app.decision_at)}</TD>
                  <TD><StatusBadge status="approved" label="Approved" /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AppEditing() {
  const [filters, setFilters] = useState({ ref: "", company: "", state: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ ref: "", company: "", state: "", from: "", to: "" });

  useEffect(() => {
    setLoading(true);
    api.get("/nodal/applications", { params: { status: "query", limit: 100 } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = rows.filter((r) => {
    if (filters.ref && !r.reference_no?.toLowerCase().includes(filters.ref.toLowerCase())) return false;
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <FilterBar onClear={clear}>
        <FL label="Application Ref. No."><FilterInput placeholder="EPAAS-..." value={filters.ref} onChange={(v) => set("ref", v)} /></FL>
        <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="State"><FilterSelect value={filters.state} onChange={(v) => set("state", v)} options={STATES} placeholder="All" /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
      </FilterBar>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>App. Ref. No.</TH>
                <TH>App. Type</TH>
                <TH>Application Name</TH>
                <TH>Company / Org.</TH>
                <TH>Forwarded On</TH>
                <TH>Action</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <EmptyTable cols={7} />
              ) : displayed.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{app.reference_no ?? "—"}</span></TD>
                  <TD>{app.app_type ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate">{app.product_name ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{fmt(app.submitted_at)}</TD>
                  <TD>
                    <button className="px-2.5 py-1 text-[10px] font-bold bg-black text-white hover:bg-white hover:text-black border border-black rounded transition-colors">Respond</button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function WithdrawalApproval() {
  const [filters, setFilters] = useState({ approvalNo: "", company: "", from: "", to: "", reason: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ approvalNo: "", company: "", from: "", to: "", reason: "" });

  useEffect(() => {
    setLoading(true);
    api.get("/nodal/applications", { params: { status: "approved", limit: 100 } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = rows.filter((r) => {
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <FilterBar onClear={clear}>
        <FL label="Approval No."><FilterInput placeholder="APPR-..." value={filters.approvalNo} onChange={(v) => set("approvalNo", v)} /></FL>
        <FL label="Company / Org Name"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
        <FL label="Reason"><FilterSelect value={filters.reason} onChange={(v) => set("reason", v)} options={W_REASONS} placeholder="All" /></FL>
      </FilterBar>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>Approval No.</TH>
                <TH>Company / Org.</TH>
                <TH>Issue Date</TH>
                <TH>Request Date</TH>
                <TH>Status</TH>
                <TH>Action</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <EmptyTable cols={7} />
              ) : displayed.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD className="text-gray-500 font-mono text-[10px]">—</TD>
                  <TD className="max-w-[160px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{fmt(app.decision_at)}</TD>
                  <TD>—</TD>
                  <TD><StatusBadge status={app.status} /></TD>
                  <TD>
                    <button className="px-2.5 py-1 text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 rounded transition-colors">Withdraw</button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AppealReviewTab() {
  const [filters, setFilters] = useState({ appNo: "", company: "", orderDate: "", from: "", to: "" });
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ appNo: "", company: "", orderDate: "", from: "", to: "" });
  return (
    <>
      <FilterBar onClear={clear}>
        <FL label="App No."><FilterInput placeholder="EPAAS-..." value={filters.appNo} onChange={(v) => set("appNo", v)} /></FL>
        <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="Rejection / Appellate Date"><FilterInput type="date" value={filters.orderDate} onChange={(v) => set("orderDate", v)} /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
      </FilterBar>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>Application No.</TH>
                <TH>Company / Org.</TH>
                <TH>Food Category</TH>
                <TH>Product Name</TH>
                <TH>Request Date</TH>
                <TH>Days Remaining</TH>
                <TH>Action</TH>
              </tr>
            </thead>
            <tbody><EmptyTable cols={8} /></tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PendingActions({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab ?? "doc_scrutiny");
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  return (
    <>
      <PendingTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "doc_scrutiny"  && <DocScrutinization />}
      {activeTab === "app_editing"   && <AppEditing />}
      {activeTab === "withdrawal"    && <WithdrawalApproval />}
      {activeTab === "appeal_review" && <AppealReviewTab />}
    </>
  );
}

// ── Application Based Reports (5 pages, shared component) ────────────────────

const APP_REPORT_TITLES = {
  approved: "Approved Applications",
  rejected: "Rejected Applications",
  withdrawn: "Withdrawn by Applicant",
  appeal:   "Application for Appeal",
  review:   "Application for Review",
};

const FOOD_CAT_OPTS = [
  { value: "NSF",       label: "Non Specified Food (NSF)" },
  { value: "CA",        label: "Claim Approval (CA)" },
  { value: "rPET",      label: "rPET" },
  { value: "AA",        label: "Ayurveda Ahara (AA)" },
  { value: "Any Other", label: "Any Other" },
];

const APP_TYPE_OPTS = [
  { value: "New",    label: "New" },
  { value: "Appeal", label: "Appeal" },
  { value: "Review", label: "Review" },
];

function AppBasedReportPage({ type }) {
  const [filters, setFilters] = useState({ appNo: "", company: "", appType: "", foodCat: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ appNo: "", company: "", appType: "", foodCat: "", from: "", to: "" });

  useEffect(() => {
    setLoading(true);
    const params = { limit: 200 };
    if (type === "approved")  params.status   = "approved";
    if (type === "rejected")  params.status   = "rejected";
    if (type === "withdrawn") params.status   = "rejected";
    if (type === "appeal")    params.app_type = "Appeal";
    if (type === "review")    params.app_type = "Review";
    api.get("/nodal/applications", { params })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [type]);

  const displayed = rows.filter((r) => {
    if (filters.appNo   && !r.reference_no?.toLowerCase().includes(filters.appNo.toLowerCase()))   return false;
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.appType && r.app_type !== filters.appType)       return false;
    if (filters.foodCat && r.food_category !== filters.foodCat)  return false;
    return true;
  });

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <FL label="App No."><FilterInput placeholder="EPAAS-..." value={filters.appNo} onChange={(v) => set("appNo", v)} /></FL>
          <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
          <FL label="Application Type"><FilterSelect value={filters.appType} onChange={(v) => set("appType", v)} options={APP_TYPE_OPTS} placeholder="All" /></FL>
          <FL label="Food Category"><FilterSelect value={filters.foodCat} onChange={(v) => set("foodCat", v)} options={FOOD_CAT_OPTS} placeholder="All" /></FL>
          <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
          <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
          <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors flex-shrink-0">
            <X size={12} /> Clear
          </button>
          <div className="flex gap-2 ml-auto">
            <button className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
              <Download size={12} /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
              <Download size={12} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
            {APP_REPORT_TITLES[type]} — {displayed.length} records
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>App. No.</TH>
                <TH>Company / Org.</TH>
                <TH>Product</TH>
                <TH>App. Type</TH>
                <TH>Received</TH>
                <TH>EC Number</TH>
                <TH>EC Status</TH>
                <TH>Date of Issue (Form 2)</TH>
                <TH>Final Status</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <EmptyTable cols={10} />
              ) : displayed.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{app.reference_no ?? "—"}</span></TD>
                  <TD className="max-w-[160px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate">{app.product_name ?? "—"}</TD>
                  <TD>{app.app_type ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{fmt(app.submitted_at)}</TD>
                  <TD className="font-mono text-[10px] text-gray-500">—</TD>
                  <TD>—</TD>
                  <TD className="whitespace-nowrap">{fmt(app.decision_at)}</TD>
                  <TD><StatusBadge status={app.status} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Reports Section (3 sub-pages) ─────────────────────────────────────────────

function ApprovedAppReport() {
  const [filters, setFilters] = useState({ approvalNo: "", refNo: "", appStatus: "", company: "", catNo: "", product: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => { setFilters({ approvalNo: "", refNo: "", appStatus: "", company: "", catNo: "", product: "", from: "", to: "" }); setRows([]); };

  const doSearch = () => {
    setLoading(true);
    const params = {};
    if (filters.from) params.date_from = filters.from;
    if (filters.to)   params.date_to   = filters.to;
    api.get("/nodal/reports/approved", { params })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const displayed = rows.filter((r) => {
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.product && !r.product_name?.toLowerCase().includes(filters.product.toLowerCase())) return false;
    if (filters.refNo   && !r.reference_no?.toLowerCase().includes(filters.refNo.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <FL label="Approval No."><FilterInput placeholder="APPR-..." value={filters.approvalNo} onChange={(v) => set("approvalNo", v)} /></FL>
          <FL label="Reference No."><FilterInput placeholder="EPAAS-..." value={filters.refNo} onChange={(v) => set("refNo", v)} /></FL>
          <FL label="Approved Application">
            <FilterSelect value={filters.appStatus} onChange={(v) => set("appStatus", v)}
              options={[{ value: "approved", label: "Approved" }, { value: "withdrawn", label: "Withdrawn" }, { value: "closed", label: "Closed" }, { value: "rejected", label: "Rejected" }]}
              placeholder="Select..." />
          </FL>
          <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
          <FL label="Category No."><FilterInput placeholder="Category..." value={filters.catNo} onChange={(v) => set("catNo", v)} /></FL>
          <FL label="Product Name"><FilterInput placeholder="Product..." value={filters.product} onChange={(v) => set("product", v)} /></FL>
          <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
          <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
          <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors flex-shrink-0"><X size={12} /> Clear</button>
          <button onClick={doSearch} className="px-5 py-2 text-xs font-bold text-white rounded-lg flex-shrink-0" style={{ backgroundColor: "#3D1C10" }}>Search</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>Approval No.</TH>
                <TH>Reference No.</TH>
                <TH>Company / Org.</TH>
                <TH>Category</TH>
                <TH>Product Name</TH>
                <TH>Status</TH>
                <TH>Issue Date</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">Use filters above and click Search</td></tr>
              ) : displayed.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD className="font-mono text-[10px] text-gray-500">—</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{row.reference_no ?? "—"}</span></TD>
                  <TD className="max-w-[160px] truncate font-medium">{row.organization_name ?? "—"}</TD>
                  <TD>{row.food_category ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate">{row.product_name ?? "—"}</TD>
                  <TD><StatusBadge status="approved" label="Approved" /></TD>
                  <TD className="whitespace-nowrap">{fmt(row.decision_at)}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const STATUS_13_COLS = [
  "Sr. No.", "Application No.", "Name & Address of Applicant", "Name of Product",
  "Date of Receipt", "EC Number", "EC Status", "Date of Receipt of Appeal",
  "Date of Appellate Order", "Date of Receipt of Review", "Date of Review Order",
  "Date of Issue of Form II", "Final Status",
];

function StatusTable({ rows, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr>{STATUS_13_COLS.map((c) => <TH key={c}>{c}</TH>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="py-10 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={13} className="py-10 text-center text-gray-400">No records found</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-blue-50/30 transition-colors">
                <TD className="text-center text-gray-400">{i + 1}</TD>
                <TD><span className="font-mono text-[10px] text-blue-600">{row.reference_no ?? "—"}</span></TD>
                <TD className="max-w-[180px] truncate">{row.organization_name ?? row.applicant_name ?? "—"}</TD>
                <TD className="max-w-[140px] truncate">{row.product_name ?? "—"}</TD>
                <TD className="whitespace-nowrap">{fmt(row.submitted_at)}</TD>
                <TD className="font-mono text-[10px]">—</TD>
                <TD>—</TD>
                <TD>—</TD>
                <TD>—</TD>
                <TD>—</TD>
                <TD>—</TD>
                <TD className="whitespace-nowrap">{fmt(row.decision_at)}</TD>
                <TD><StatusBadge status={row.status} /></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppStatusReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const doSearch = () => {
    setLoading(true);
    const params = {};
    if (from) params.date_from = from;
    if (to)   params.date_to   = to;
    api.get("/nodal/reports/status", { params })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { doSearch(); }, []); // eslint-disable-line

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <FL label="From Date"><FilterInput type="date" value={from} onChange={setFrom} /></FL>
          <FL label="To Date"><FilterInput type="date" value={to} onChange={setTo} /></FL>
          <button onClick={() => { setFrom(""); setTo(""); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors"><X size={12} /> Clear</button>
          <button onClick={doSearch} className="px-5 py-2 text-xs font-bold text-white rounded-lg" style={{ backgroundColor: "#3D1C10" }}>Search</button>
        </div>
      </div>
      <StatusTable rows={rows} loading={loading} />
    </>
  );
}

function TrackApplicationPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await api.get("/nodal/reports/track", { params: { reference_no: query.trim() } });
      setResult(r.data.data);
      setHistory(r.data.history ?? []);
    } catch (e) {
      setError(e.response?.data?.message ?? "Application not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">App Ref. No. / Approval No.</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Enter EPAAS reference or approval number…"
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black"
            />
          </div>
          <button onClick={doSearch} className="px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 flex-shrink-0" style={{ backgroundColor: "#3D1C10" }}>
            <Search size={12} /> Search
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
      {loading && <div className="py-10 text-center text-gray-400 text-sm">Searching…</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-4">Application Details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              {[
                ["Reference No.", result.reference_no ?? "—"],
                ["App. Type",     result.app_type ?? "—"],
                ["Status",        result.status ?? "—"],
                ["Organisation",  result.organization_name ?? "—"],
                ["Product",       result.product_name ?? "—"],
                ["Submitted",     fmt(result.submitted_at)],
                ["Decision Date", fmt(result.decision_at)],
                ["Applicant",     result.applicant_name ?? "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-gray-500 font-medium mb-0.5">{label}</div>
                  <div className="font-semibold text-gray-800">{val}</div>
                </div>
              ))}
            </div>
          </div>
          {history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-500">Workflow History</div>
              <div className="divide-y divide-gray-50">
                {history.map((h, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-700">{h.action_type}{h.to_status ? ` → ${h.to_status}` : ""}</div>
                      {h.remarks && <div className="text-[11px] text-gray-500 mt-0.5">{h.remarks}</div>}
                      <div className="text-[10px] text-gray-400 mt-0.5">{h.performed_by_name ?? ""} · {fmt(h.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const REPORT_CARDS = [
  { key: "approved_report", label: "Approved Application Reports", desc: "View approved applications with detailed filters",       icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  { key: "app_status",      label: "Application Status",           desc: "View current status of all submitted applications",      icon: Activity,     color: "text-teal-600",  bg: "bg-teal-50"  },
  { key: "track_app",       label: "Track Application / Approved", desc: "Search and track individual application by reference no", icon: Search,       color: "text-blue-600",  bg: "bg-blue-50"  },
];

function ReportsSection() {
  const [sub, setSub] = useState(null);

  const back = (
    <button onClick={() => setSub(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black mb-5 transition-colors">
      ← Back to Reports
    </button>
  );

  if (sub === "approved_report") return <>{back}<h3 className="text-sm font-bold text-gray-800 mb-4">Approved Application Reports</h3><ApprovedAppReport /></>;
  if (sub === "app_status")      return <>{back}<h3 className="text-sm font-bold text-gray-800 mb-4">Application Status</h3><AppStatusReport /></>;
  if (sub === "track_app")       return <>{back}<h3 className="text-sm font-bold text-gray-800 mb-4">Track Application / Approved</h3><TrackApplicationPage /></>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {REPORT_CARDS.map(({ key, label, desc, icon: Icon, color, bg }) => (
        <button key={key} onClick={() => setSub(key)}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all cursor-pointer"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} mb-3`}>
            <Icon size={20} className={color} />
          </div>
          <div className="font-bold text-sm text-gray-800 mb-1">{label}</div>
          <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
          <div className="flex items-center gap-1 text-xs font-semibold mt-3" style={{ color: "#3D1C10" }}>
            View Report <ChevronRight size={12} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Appeal and Review ─────────────────────────────────────────────────────────

const APPEAL_TABS = [
  { key: "all",    label: "All"    },
  { key: "appeal", label: "Appeal" },
  { key: "review", label: "Review" },
];

function AppealAndReviewPage() {
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ appNo: "", company: "", orderDate: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clear = () => setFilters({ appNo: "", company: "", orderDate: "", from: "", to: "" });

  useEffect(() => {
    setLoading(true);
    const params = { limit: 200 };
    if (tab === "appeal") params.app_type = "Appeal";
    if (tab === "review") params.app_type = "Review";
    api.get("/nodal/applications", { params })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const displayed = rows.filter((r) => {
    if (filters.appNo   && !r.reference_no?.toLowerCase().includes(filters.appNo.toLowerCase())) return false;
    if (filters.company && !r.organization_name?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="flex gap-1.5 mb-5">
        {APPEAL_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-full text-xs font-bold transition-colors"
            style={tab === t.key ? { backgroundColor: "#3D1C10", color: "white" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <FilterBar onClear={clear}>
        <FL label="App No."><FilterInput placeholder="EPAAS-..." value={filters.appNo} onChange={(v) => set("appNo", v)} /></FL>
        <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
        <FL label="Date of Rejection / Appellate Order"><FilterInput type="date" value={filters.orderDate} onChange={(v) => set("orderDate", v)} /></FL>
        <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
        <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
      </FilterBar>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>Application No.</TH>
                <TH>Company / Org.</TH>
                <TH>Food Category</TH>
                <TH>Product Name</TH>
                <TH>Request Date</TH>
                <TH>Days Remaining</TH>
                <TH>Type</TH>
                <TH>Action</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <EmptyTable cols={9} />
              ) : displayed.map((app, i) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{app.reference_no ?? "—"}</span></TD>
                  <TD className="max-w-[160px] truncate font-medium">{app.organization_name ?? "—"}</TD>
                  <TD>{app.food_category ?? "—"}</TD>
                  <TD className="max-w-[140px] truncate">{app.product_name ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{fmt(app.submitted_at)}</TD>
                  <TD><span className="font-bold text-amber-600">{app.days_remaining ?? "—"}</span></TD>
                  <TD>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${app.app_type === "Appeal" ? "bg-purple-100 text-purple-700" : app.app_type === "Review" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {app.app_type ?? "—"}
                    </span>
                  </TD>
                  <TD>
                    <button className="px-2.5 py-1 text-[10px] font-bold bg-black text-white hover:bg-white hover:text-black border border-black rounded transition-colors">Proceed</button>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Extension of Time ─────────────────────────────────────────────────────────

function ExtensionOfTimePage() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = (t) => {
    setLoading(true);
    api.get("/nodal/extensions", { params: { status: t } })
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(tab); }, [tab]);

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/nodal/extensions/${id}`, { action });
      fetchData(tab);
    } catch {}
  };

  const cols = tab === "pending" ? 12 : 11;

  return (
    <>
      <div className="flex gap-1.5 mb-5">
        {[{ key: "pending", label: "Pending" }, { key: "completed", label: "Completed" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-full text-xs font-bold transition-colors"
            style={tab === t.key ? { backgroundColor: "#3D1C10", color: "white" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr>
                <TH className="w-10">Sr. No.</TH>
                <TH>App. Ref. No.</TH>
                <TH>Company / Org.</TH>
                <TH>Product</TH>
                <TH>Product Category</TH>
                <TH>Application Date</TH>
                <TH>Requested Date</TH>
                <TH>Status</TH>
                <TH>Applicant Remarks</TH>
                <TH>Documents</TH>
                <TH>History</TH>
                {tab === "pending" && <TH>Action</TH>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={cols} className="py-10 text-center text-gray-400">No extension requests found</td></tr>
              ) : rows.map((ext, i) => (
                <tr key={ext.id} className="hover:bg-blue-50/30 transition-colors">
                  <TD className="text-center text-gray-400">{i + 1}</TD>
                  <TD><span className="font-mono text-[10px] text-blue-600">{ext.reference_no ?? "—"}</span></TD>
                  <TD className="max-w-[140px] truncate font-medium">—</TD>
                  <TD className="max-w-[120px] truncate">—</TD>
                  <TD>{ext.app_type ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{fmt(ext.created_at)}</TD>
                  <TD className="whitespace-nowrap">{fmt(ext.current_due_date)}</TD>
                  <TD><StatusBadge status={ext.status} /></TD>
                  <TD className="max-w-[160px] truncate text-gray-500">{ext.query_text ?? "—"}</TD>
                  <TD><button className="text-[10px] text-blue-600 hover:underline">View</button></TD>
                  <TD><button className="text-[10px] text-blue-600 hover:underline">View</button></TD>
                  {tab === "pending" && (
                    <TD>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAction(ext.id, "approve")} className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 rounded transition-colors">Grant</button>
                        <button onClick={() => handleAction(ext.id, "reject")}  className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 rounded transition-colors">Reject</button>
                      </div>
                    </TD>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Search Console ────────────────────────────────────────────────────────────

const SEARCH_STATUSES = [
  { value: "pending",  label: "Pending"        },
  { value: "scrutiny", label: "Under Scrutiny" },
  { value: "approved", label: "Approved"       },
  { value: "rejected", label: "Rejected"       },
  { value: "query",    label: "Query Raised"   },
];

function SearchConsolePage() {
  const [filters, setFilters] = useState({ appNo: "", company: "", product: "", appType: "", status: "", ecNo: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const clear = () => {
    setFilters({ appNo: "", company: "", product: "", appType: "", status: "", ecNo: "", from: "", to: "" });
    setRows([]);
    setSearched(false);
  };

  const doSearch = async () => {
    const q = [filters.appNo, filters.company, filters.product].filter(Boolean).join(" ");
    if (!q && !filters.appType && !filters.status && !filters.from && !filters.to) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (q)              params.q        = q;
      if (filters.appType) params.app_type = filters.appType;
      if (filters.status)  params.status   = filters.status;
      if (filters.from)    params.date_from = filters.from;
      if (filters.to)      params.date_to   = filters.to;
      const r = await api.get("/nodal/search", { params });
      setRows(r.data.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <FL label="Application No."><FilterInput placeholder="EPAAS-..." value={filters.appNo} onChange={(v) => set("appNo", v)} /></FL>
          <FL label="Company / Org"><FilterInput placeholder="Search..." value={filters.company} onChange={(v) => set("company", v)} /></FL>
          <FL label="Product Name"><FilterInput placeholder="Product..." value={filters.product} onChange={(v) => set("product", v)} /></FL>
          <FL label="App. Type"><FilterSelect value={filters.appType} onChange={(v) => set("appType", v)} options={APP_TYPES} placeholder="All" /></FL>
          <FL label="Status"><FilterSelect value={filters.status} onChange={(v) => set("status", v)} options={SEARCH_STATUSES} placeholder="All" /></FL>
          <FL label="EC Number"><FilterInput placeholder="EC-..." value={filters.ecNo} onChange={(v) => set("ecNo", v)} /></FL>
          <FL label="From Date"><FilterInput type="date" value={filters.from} onChange={(v) => set("from", v)} /></FL>
          <FL label="To Date"><FilterInput type="date" value={filters.to} onChange={(v) => set("to", v)} /></FL>
          <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 py-2 px-2 transition-colors flex-shrink-0"><X size={12} /> Clear</button>
          <button onClick={doSearch} className="px-5 py-2 text-xs font-bold text-white rounded-lg flex-shrink-0" style={{ backgroundColor: "#3D1C10" }}>Search</button>
        </div>
      </div>

      {searched ? (
        <StatusTable rows={rows} loading={loading} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 text-center">
          <Search size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">Use the filters above to search applications</p>
        </div>
      )}
    </>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/nodal/notifications")
      .then((r) => setNotifs(r.data.notifications ?? r.data.data ?? []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    api.patch(`/nodal/notifications/${id}/read`).then(() => {
      setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }).catch(() => {});
  };

  const markAllRead = () => {
    api.patch("/nodal/notifications/read-all").then(() => {
      setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })));
    }).catch(() => {});
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Notifications</div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors">Mark all as read</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : notifs.length === 0 ? (
          <div className="py-12 text-center">
            <BellRing size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No notifications</p>
          </div>
        ) : notifs.map((n) => (
          <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
            className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? "bg-gray-300" : "bg-teal-500"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>{n.title ?? "Notification"}</div>
              <div className="text-xs text-gray-500 mt-0.5">{n.message ?? n.description ?? ""}</div>
            </div>
            <div className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">{fmt(n.created_at)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NodalDashboard() {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [tileView, setTileView] = useState("tile_dashboard");
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/nodal/stats"),
      api.get("/nodal/applications", { params: { limit: 20 } }),
    ]).then(([s, a]) => {
      setStats(s.data.stats ?? s.data);
      setApps(a.data.data ?? a.data ?? []);
    }).catch(() => {}).finally(() => setAppsLoading(false));
  }, []);

  const handleNavigate = (key) => {
    setActiveKey(key);
    if (key === "dashboard") setTileView("tile_dashboard");
  };

  const isDashboardSection = activeKey === "dashboard";

  const renderContent = () => {
    if (activeKey === "doc_scrutiny")  return <DocScrutinization />;
    if (activeKey === "granted")       return <GrantedApproval />;
    if (activeKey === "app_editing")   return <AppEditing />;
    if (activeKey === "withdrawal")    return <WithdrawalApproval />;

    if (["approved", "rejected", "withdrawn", "appeal", "review"].includes(activeKey))
      return <AppBasedReportPage key={activeKey} type={activeKey} />;

    if (activeKey === "reports_main")  return <ReportsSection />;
    if (activeKey === "appeal_review") return <AppealAndReviewPage />;
    if (activeKey === "extension")     return <ExtensionOfTimePage />;
    if (activeKey === "search")        return <SearchConsolePage />;

    // Dashboard section
    if (tileView === "tile_notifications") return <Notifications />;
    if (tileView === "tile_pending")       return <PendingActions initialTab="doc_scrutiny" />;
    return (
      <DashboardOverview
        stats={stats}
        apps={apps}
        loading={appsLoading}
        onSectionNav={(key) => setActiveKey(key === "app_status" ? "reports_main" : key)}
      />
    );
  };

  return (
    <NodalLayout activeKey={activeKey} onNavigate={handleNavigate}>
      <div className="p-5">
        {isDashboardSection && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {TILES.map(({ key, label, activeBg, countKey }) => {
              const isActive = tileView === key;
              const count = countKey === "pending" ? (stats?.pending ?? 0) : countKey === "notif" ? 0 : null;
              return (
                <button
                  key={key}
                  onClick={() => setTileView(key)}
                  className="rounded-xl p-5 text-left transition-all duration-150 shadow-sm cursor-pointer border min-h-[90px]"
                  style={{ backgroundColor: isActive ? activeBg : "white", borderColor: isActive ? "transparent" : "#e5e7eb" }}
                >
                  {count !== null && (
                    <div className="text-3xl font-bold mb-1" style={{ color: isActive ? "white" : activeBg }}>{count}</div>
                  )}
                  <div className="text-sm font-bold" style={{ color: isActive ? "white" : "#374151" }}>{label}</div>
                </button>
              );
            })}
          </div>
        )}
        {renderContent()}
      </div>
    </NodalLayout>
  );
}
