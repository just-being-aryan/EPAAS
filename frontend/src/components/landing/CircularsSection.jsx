import { Bell, FileDown, ChevronRight, Calendar } from "lucide-react";

const CIRCULARS = [
  {
    id: 1,
    date: "18 Apr 2025",
    title: "Revised Guidelines for Novel Food Applications — Submission Format Update",
    type: "Circular",
    new: true,
  },
  {
    id: 2,
    date: "05 Apr 2025",
    title: "Extension of Timeline for rPET Application Review — Q1 2025",
    type: "Order",
    new: true,
  },
  {
    id: 3,
    date: "22 Mar 2025",
    title: "Expert Committee Meeting Schedule — April to June 2025",
    type: "Notice",
    new: false,
  },
  {
    id: 4,
    date: "10 Mar 2025",
    title: "Updated Fee Structure for Product Approval Applications effective 1 April 2025",
    type: "Notification",
    new: false,
  },
  {
    id: 5,
    date: "01 Mar 2025",
    title: "Mandatory E-PAAS Portal Submission for All New Product Approvals from 1 April 2025",
    type: "Circular",
    new: false,
  },
];

const TYPE_COLORS = {
  Circular: "bg-blue-100 text-blue-700",
  Order: "bg-red-100 text-red-700",
  Notice: "bg-yellow-100 text-yellow-700",
  Notification: "bg-green-100 text-green-700",
};

export default function CircularsSection() {
  return (
    <section id="circulars" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Circulars list */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[#1a6e35] text-xs font-semibold uppercase tracking-widest mb-1">Updates</p>
                <h2 className="text-xl font-bold text-[#1e3a5f]">Circulars &amp; Notifications</h2>
              </div>
              <button className="text-xs font-semibold text-[#1a6e35] hover:underline flex items-center gap-1">
                View All <ChevronRight size={12} />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {CIRCULARS.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-4 p-4 hover:bg-[#eef6fb] transition-colors cursor-pointer ${
                    i < CIRCULARS.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Bell size={14} className="text-[#1a6e35]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>
                        {c.type}
                      </span>
                      {c.new && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#1e3a5f] font-medium leading-snug">{c.title}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      {c.date}
                    </div>
                  </div>
                  <FileDown size={14} className="text-gray-300 hover:text-[#1a6e35] flex-shrink-0 mt-1 cursor-pointer" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Help box */}
            <div className="bg-[#1e3a5f] text-white rounded-xl p-6">
              <h3 className="font-bold text-sm mb-2">Need Help?</h3>
              <p className="text-blue-200 text-xs leading-relaxed mb-4">
                Our helpdesk is available Monday to Friday, 9:30 AM – 5:30 PM. Contact us for technical support or application guidance.
              </p>
              <a
                href="tel:18001114011"
                className="block text-center bg-white text-[#1e3a5f] font-semibold text-xs py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                1800-11-4011 (Toll Free)
              </a>
            </div>

            {/* Important dates */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-sm text-[#1e3a5f] mb-4">Upcoming EC Meetings</h3>
              <div className="space-y-3">
                {[
                  { date: "15 May 2025", type: "NSF / CA Panel" },
                  { date: "22 May 2025", type: "AA / rPET Panel" },
                  { date: "10 Jun 2025", type: "NSF / Any Other" },
                ].map((m) => (
                  <div key={m.date} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1e3a5f]">{m.date}</span>
                    <span className="text-gray-500">{m.type}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-4">
                * Applications must be complete 30 days before meeting date to be included in the agenda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
