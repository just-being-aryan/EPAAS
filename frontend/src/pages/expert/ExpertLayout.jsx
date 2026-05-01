import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderOpen, CalendarDays, Bell, LogOut, Home,
  Menu, HelpCircle, ChevronDown, Users,
} from "lucide-react";
import api from "../../lib/api";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "dockets", label: "Case Dockets", icon: FolderOpen },
  { key: "agenda", label: "Meeting Agenda", icon: CalendarDays },
  { key: "notifications", label: "Notifications", icon: Bell },
];

function labelFor(key) {
  return NAV.find((n) => n.key === key)?.label ?? "Dashboard";
}

function Sidebar({ activeKey, onNavigate, onClose }) {
  const nav = (key) => {
    onNavigate(key);
    onClose?.();
  };
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#B45309]" />
          <div className="text-gray-900 font-bold text-lg tracking-wide">E-PAAS</div>
        </div>
        <div className="text-gray-400 text-[9px] uppercase tracking-wider">Expert Committee Portal</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => nav(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                active ? "bg-[#B45309]/10 text-[#B45309]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 flex-shrink-0 border-t border-gray-100">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <Home size={13} /> Back to Landing
        </Link>
      </div>
    </div>
  );
}

export default function ExpertLayout({ activeKey, onNavigate, children }) {
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
    api.get("/expert/notifications", { params: { limit: 1 } })
      .then((r) => setNotifCount(r.data.unread ?? r.data.unread_count ?? 0))
      .catch(() => {});
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const initials = user?.username
    ? user.username.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : "EC";

  return (
    <div className="min-h-screen flex bg-[#F5F6FA]">
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 lg:m-3 lg:rounded-2xl lg:h-[calc(100vh-1.5rem)] lg:sticky lg:top-3 bg-white border border-gray-100 shadow-sm overflow-hidden">
        <Sidebar activeKey={activeKey} onNavigate={onNavigate} />
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 lg:hidden transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar activeKey={activeKey} onNavigate={onNavigate} onClose={() => setSidebarOpen(false)} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl my-3 mr-3 shadow-sm overflow-hidden">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Expert Committee</div>
              <div className="text-sm font-bold text-black leading-tight">{labelFor(activeKey)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500"><HelpCircle size={14} /></button>
            <button onClick={() => onNavigate("notifications")} className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500">
              <Bell size={14} />
              {notifCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{notifCount}</span>}
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">{initials}</div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px] leading-tight">{user?.username ?? "-"}</div>
                <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{user?.email}</div>
              </div>
              <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
            </div>
            <button onClick={logout} className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 ml-1"><LogOut size={13} /></button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
