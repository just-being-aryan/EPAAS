import { createContext, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Receipt, MessageSquare,
  LogOut, Menu, Bell, HelpCircle, ChevronDown,
} from "lucide-react";
import api from "../../lib/api";

const UserCtx = createContext(null);
export const useApplicantUser = () => useContext(UserCtx);

const NAV = [
  { label: "Dashboard",            icon: LayoutDashboard, href: "/applicant/dashboard" },
  { label: "Application Details",  icon: FileText,        href: "/applicant/applications" },
  { label: "Tax Invoice/Payments", icon: Receipt,         href: "/applicant/invoices" },
  { label: "Requests",             icon: MessageSquare,   href: "/applicant/requests" },
];

export default function ApplicantLayout({ pageTitle, headerRight, children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]               = useState(null);
  const [notifCount, setNotifCount]   = useState(0);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }

    Promise.all([
      api.get("/auth/me"),
      api.get("/applications/stats"),
      api.get("/applications", { params: { limit: 1 } }),
    ]).then(([me, st, list]) => {
      setUser(me.data.user);
      setNotifCount(st.data.stats.reverted ?? 0);
      const first = list.data.data[0];
      if (first?.organization_name) setCompanyName(first.organization_name);
    }).catch(() => {
      localStorage.removeItem("token");
      navigate("/");
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const initials = user?.username
    ? user.username.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <UserCtx.Provider value={{ user, companyName, notifCount }}>
      <div className="min-h-screen flex bg-[#F5F6FA]">

        {/* ── Sidebar ── */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex lg:m-3 lg:rounded-2xl lg:h-[calc(100vh-1.5rem)] bg-white border border-gray-100 shadow-sm`}>

          <div className="flex items-center gap-2.5 px-5 py-5 flex-shrink-0">
            <div>
              <div className="text-gray-900 font-bold text-lg tracking-wide">E-PAAS</div>
              <div className="text-gray-400 text-[9px] uppercase tracking-wider">Applicant Portal</div>
            </div>
          </div>

          <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-0.5">
            {NAV.map(({ label, icon: Icon, href }) => {
              const active = location.pathname === href;
              return (
                <Link
                  key={label}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#39B5E0]/10 text-[#39B5E0]"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
            <div className="text-[11px] text-gray-400 mb-0.5">Logged in as</div>
            <div className="text-gray-800 text-sm font-bold truncate">{user?.username ?? "—"}</div>
            <div className="text-gray-400 text-[11px] truncate mb-3">{user?.email ?? ""}</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-gray-400 font-semibold hover:text-gray-700 transition-colors"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Main (floating rounded card) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl my-3 mr-3 shadow-sm overflow-hidden">

          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Applicant</div>
                <div className="text-sm font-bold text-black leading-tight">{pageTitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {headerRight && <div className="mr-1">{headerRight}</div>}

              <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors">
                <HelpCircle size={14} />
              </button>

              <button className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors">
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
                    {companyName || user?.username}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{user?.email}</div>
                </div>
                <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </UserCtx.Provider>
  );
}