import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Download, X, FileText, Plus } from "lucide-react";
import ApplicantLayout from "./Layout";
import api from "../../lib/api";

const APP_TYPE_OPTIONS = [
  { value: "",          label: "All App. Types" },
  { value: "NSF",       label: "Non Specified Food (NSF)" },
  { value: "CA",        label: "Claim Approval (CA)" },
  { value: "AA",        label: "Ayurveda Ahara (AA)" },
  { value: "rPET",      label: "rPET" },
  { value: "Any Other", label: "Any Other" },
];

const STATUS_MAP = {
  draft:    { label: "Draft",          cls: "bg-gray-100 text-gray-600 border-gray-200" },
  pending:  { label: "Pending",        cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  scrutiny: { label: "Under Scrutiny", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  ec:       { label: "With EC",        cls: "bg-teal-100 text-teal-700 border-teal-200" },
  query:    { label: "Query Raised",   cls: "bg-orange-500 text-white border-orange-500" },
  approved: { label: "Approved",       cls: "bg-green-600 text-white border-green-600" },
  rejected: { label: "Rejected",       cls: "bg-red-600 text-white border-red-600" },
};

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function ActionCell({ app, navigate }) {
  if (app.status === "draft") return (
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={() => navigate(`/dashboard/applications/${app.id}/edit`)}
        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-black hover:bg-white hover:text-black border border-black text-white transition-colors whitespace-nowrap">Edit</button>
      <button onClick={() => navigate(`/dashboard/applications/${app.id}`)}
        className="px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap">View</button>
    </div>
  );
  if (app.status === "query") return (
    <button onClick={() => navigate(`/dashboard/applications/${app.id}/respond`)}
      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-black hover:bg-white hover:text-black border border-black text-white transition-colors whitespace-nowrap">Respond</button>
  );
  return (
    <button onClick={() => navigate(`/dashboard/applications/${app.id}`)}
      className="px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors whitespace-nowrap">View</button>
  );
}

function PageContent() {
  const navigate = useNavigate();
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [appType, setAppType] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (appType) params.app_type = appType;
      const res = await api.get("/applications", { params });
      setApps(res.data.data);
    } catch { /**/ } finally { setLoading(false); }
  }, [appType]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const displayed = search
    ? apps.filter((a) =>
        a.display_ref?.toLowerCase().includes(search.toLowerCase()) ||
        a.organization_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.address?.toLowerCase().includes(search.toLowerCase())
      )
    : apps;

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-black text-sm">Complete List of Applications</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{displayed.length} record{displayed.length !== 1 ? "s" : ""} across all statuses</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search reference, company..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-52 focus:outline-none focus:border-black" />
            </div>
            <button className="flex items-center gap-1.5 border border-black text-black hover:bg-black hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-gray-500">FILTERS:</span>
          <select disabled className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-gray-50 text-gray-400 cursor-not-allowed">
            <option>All Statuses</option>
          </select>
          <select value={appType} onChange={(e) => setAppType(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:border-black">
            {APP_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(appType || search) && (
            <button onClick={() => { setAppType(""); setSearch(""); }}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-600 transition-colors">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="py-14 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No applications found</p>
            <Link to="/dashboard/applications/new"
              className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white hover:text-black border border-black mt-4 transition-colors">
              <Plus size={13} /> New Application
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {["SR.", "Company Name", "Reference No.", "Address", "App. Type", "Food Category", "Last Updated", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((app, i) => (
                  <tr key={app.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-400 text-center">{i + 1}</td>
                    <td className="px-4 py-3 border-b border-gray-50 font-medium text-black max-w-[160px] truncate">{app.organization_name ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50"><span className="font-mono text-gray-700 text-[11px]">{app.display_ref}</span></td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 max-w-[140px] truncate">{app.address ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-700 whitespace-nowrap">{app.app_type}</td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{app.food_category ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{fmt(app.updated_at || app.submitted_at || app.created_at)}</td>
                    <td className="px-4 py-3 border-b border-gray-50"><StatusBadge status={app.status} /></td>
                    <td className="px-4 py-3 border-b border-gray-50"><ActionCell app={app} navigate={navigate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationDetails() {
  return (
    <ApplicantLayout
      pageTitle="Application Details"
      headerRight={
        <Link to="/dashboard/applications/new"
          className="flex items-center gap-1.5 bg-black hover:bg-white hover:text-black border border-black text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> New Application
        </Link>
      }
    >
      <PageContent />
    </ApplicantLayout>
  );
}
