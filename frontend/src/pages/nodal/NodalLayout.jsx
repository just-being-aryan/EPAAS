import { createContext, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, FileBarChart, BarChart3, MessageSquare,
  Clock, Search, ChevronRight, ChevronDown, LogOut, Home, Menu,
  HelpCircle, Bell,
} from "lucide-react";
import api from "../../lib/api";

const NodalCtx = createContext(null);
export const useNodalUser = () => useContext(NodalCtx);

// ── Sidebar nav definition ────────────────────────────────────────────────────

const NAV = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "processing",
    label: "Processing of Applications",
    icon: Settings,
    children: [
      { key: "doc_scrutiny", label: "Document Scrutinization" },
      { key: "granted",      label: "Granted Approval" },
      { key: "app_editing",  label: "App for Editing / Clarification" },
      { key: "withdrawal",   label: "Withdrawal of Approval" },
    ],
  },
  {
    key: "app_reports",
    label: "Application Based Reports",
    icon: FileBarChart,
    children: [
      { key: "approved",  label: "Approved Applications" },
      { key: "rejected",  label: "Rejected Applications" },
      { key: "withdrawn", label: "Withdrawn by Applicant" },
      { key: "appeal",    label: "Application for Appeal" },
      { key: "review",    label: "Application for Review" },
    ],
  },
  { key: "reports_main",  label: "Reports",           icon: BarChart3 },
  { key: "appeal_review", label: "Appeal and Review", icon: MessageSquare },
  { key: "extension",     label: "Extension of Time", icon: Clock },
  { key: "search",        label: "Search Console",    icon: Search },
];

function findLabel(key) {
  for (const item of NAV) {
    if (item.key === key) return item.label;
    if (item.children) {
      const child = item.children.find((c) => c.key === key);
      if (child) return child.label;
    }
  }
  return "Dashboard";
}

function findParent(key) {
  for (const item of NAV) {
    if (item.children?.find((c) => c.key === key)) return item.key;
  }
  return null;
}

// ── Sidebar Component ─────────────────────────────────────────────────────────

function Sidebar({ activeKey, onNavigate, onClose }) {
  const parent = findParent(activeKey);
  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    if (parent) init[parent] = true;
    return init;
  });

  const toggleSection = (key) => {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const navigate = (key) => {
    onNavigate(key);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="text-gray-900 font-bold text-lg tracking-wide">E-PAAS</div>
        <div className="text-gray-400 text-[9px] uppercase tracking-wider">Nodal Officer Portal</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {NAV.map((item) => {
          const isActive = activeKey === item.key;
          const isParentActive = item.children?.some((c) => c.key === activeKey);
          const isOpen = openSections[item.key];
          const Icon = item.icon;

          if (item.children) {
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleSection(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                    isParentActive
                      ? "bg-[#39B5E0]/10 text-[#39B5E0]"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1 leading-tight">{item.label}</span>
                  {isOpen
                    ? <ChevronDown size={12} className="flex-shrink-0" />
                    : <ChevronRight size={12} className="flex-shrink-0" />
                  }
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-gray-100 pl-2">
                    {item.children.map((child) => {
                      const childActive = activeKey === child.key;
                      return (
                        <button
                          key={child.key}
                          onClick={() => navigate(child.key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                            childActive
                              ? "bg-[#39B5E0]/10 text-[#39B5E0]"
                              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${childActive ? "bg-[#39B5E0]" : "bg-gray-300"}`} />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                isActive
                  ? "bg-[#39B5E0]/10 text-[#39B5E0]"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 flex-shrink-0 border-t border-gray-100">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Home size={13} /> Back to Landing
        </Link>
      </div>
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function NodalLayout({ activeKey, onNavigate, children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    api.get("/auth/me").then((r) => setUser(r.data.user)).catch(() => {
      localStorage.removeItem("token");
      navigate("/");
    });
    api.get("/nodal/notifications", { params: { limit: 1 } })
      .then((r) => setNotifCount(r.data.unread ?? 0))
      .catch(() => {});
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const initials = user?.username
    ? user.username.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : "NO";

  const pageLabel = findLabel(activeKey);

  return (
    <NodalCtx.Provider value={{ user, notifCount }}>
      <div className="h-screen overflow-hidden flex bg-[#F5F6FA]">

        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 lg:m-3 lg:rounded-2xl lg:h-[calc(100vh-1.5rem)] lg:sticky lg:top-3 bg-white border border-gray-100 shadow-sm overflow-hidden">
          <Sidebar activeKey={activeKey} onNavigate={onNavigate} />
        </aside>

        {/* Sidebar — mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed inset-y-0 left-0 z-40 w-56 lg:hidden transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar activeKey={activeKey} onNavigate={onNavigate} onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-1.5rem)] bg-white rounded-2xl my-3 mr-3 shadow-sm overflow-hidden">

          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Nodal Officer</div>
                <div className="text-sm font-bold text-black leading-tight">{pageLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors">
                <HelpCircle size={14} />
              </button>

              <button
                onClick={() => onNavigate("notifications")}
                className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors"
              >
                <Bell size={14} />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                    {notifCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 pl-1 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px] leading-tight">
                    {user?.username ?? "—"}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{user?.email}</div>
                </div>
                <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
              </div>

              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1"
              >
                <LogOut size={13} />
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </NodalCtx.Provider>
  );
}
