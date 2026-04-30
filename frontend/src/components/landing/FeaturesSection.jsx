import { ShieldCheck, Bell, FileSearch, Download, BarChart3, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Secure & Authenticated",
    desc: "Role-based access control with JWT authentication ensures only authorized users can access their applications.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Bell,
    title: "Real-time Status Updates",
    desc: "Instant notifications on application status changes, queries raised, and decision updates.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: FileSearch,
    title: "Transparent Tracking",
    desc: "Track your application through every stage — Scrutiny, Expert Committee, and Final Decision — with full visibility.",
    color: "text-violet-600 bg-violet-50",
  },
  {
    icon: Download,
    title: "Digital Documents",
    desc: "Download approval certificates, invoices, and all communication directly from the portal in PDF format.",
    color: "text-orange-600 bg-orange-50",
  },
  {
    icon: BarChart3,
    title: "Application Dashboard",
    desc: "Comprehensive dashboard with analytics on all your applications — pending, approved, reverted, and rejected.",
    color: "text-pink-600 bg-pink-50",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    desc: "Your business data and proprietary formulation details are protected under strict government data security policies.",
    color: "text-teal-600 bg-teal-50",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#1a6e35] text-xs font-semibold uppercase tracking-widest mb-2">Why E-PAAS</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-3">Key Features</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Built to simplify the approval process while ensuring full compliance with FSSAI regulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${f.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1e3a5f] text-sm mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
