import { useState } from "react";
import { Search, ArrowRight, ShieldCheck, FileCheck } from "lucide-react";

export default function HeroSection({ onOpenPanel }) {
  const [refNo, setRefNo] = useState("");

  const handleTrack = (e) => {
    e.preventDefault();
    if (refNo.trim()) {
      alert(`Tracking: ${refNo.trim()}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#39B5E0] text-white py-20">
      {/* Background texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(57, 181, 224, 1) 20px, rgba(255,255,255,0.05) 40px)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-medium mb-6 backdrop-blur-sm">
              <ShieldCheck size={13} className="text-[#9EDDFF]" />
              Government of India — Ministry of Health &amp; Family Welfare
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4 tracking-tight">
              Electronic Product &amp;
              <span className="block text-[#fff]">Claim Approval Application System</span>
            </h1>

            <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg">
              E-PAAS is the official FSSAI portal for electronic submission and tracking of product approval applications — Novel Foods, Claims, Additives, and more.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => onOpenPanel?.("signup")}
                className="flex items-center gap-2 bg-white text-[#5B7FC4] font-semibold px-6 py-3 rounded-lg hover:bg-[#E8F7FF] transition-colors text-sm"
              >
                Apply Now <ArrowRight size={16} />
              </button>
              <button
                onClick={() => onOpenPanel?.("applicant")}
                className="flex items-center gap-2 border border-white/40 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors text-sm"
              >
                Track Application
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 text-sm">
              {[
                { label: "Applications Processed", value: "12,500+" },
                { label: "Avg. Processing Time",   value: "45 Days" },
                { label: "Approval Rate",           value: "78%" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-[#9EDDFF]">{s.value}</div>
                  <div className="text-white/70 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracker Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <FileCheck size={18} className="text-[#9EDDFF]" />
              <h2 className="text-white font-semibold text-base">Track Your Application</h2>
            </div>

            <form onSubmit={handleTrack} className="mb-6">
              <label className="block text-white/70 text-xs font-medium mb-1.5">
                Application / Reference Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g. APP-2025-NSF-00123"
                  className="flex-1 bg-white/15 border border-white/30 rounded-lg px-3 py-2.5 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-[#9EDDFF] focus:bg-white/20"
                />
                <button
                  type="submit"
                  className="bg-[#5B7FC4] hover:bg-[#4A6BB0] border border-white/30 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Search size={16} />
                </button>
              </div>
            </form>

            {/* Application stages */}
            <div className="space-y-2.5">
              <p className="text-white/70 text-xs font-medium mb-3">Application Journey</p>
              {[
                { stage: "Submission",       desc: "Application filed & fees paid",  color: "bg-[#9EDDFF]" },
                { stage: "Scrutiny",         desc: "Document verification",          color: "bg-blue-400" },
                { stage: "Expert Committee", desc: "Scientific evaluation",          color: "bg-yellow-400" },
                { stage: "Decision",         desc: "Approval / Rejection",           color: "bg-purple-400" },
              ].map((s, i) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-medium">{s.stage}</span>
                      <span className="text-white/50 text-[10px]">Step {i + 1}</span>
                    </div>
                    <p className="text-white/60 text-[10px]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
