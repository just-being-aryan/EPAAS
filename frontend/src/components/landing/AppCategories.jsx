import { FlaskConical, Megaphone, Beaker, Recycle, MoreHorizontal, ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    code: "NSF",
    title: "Non Specified Foods (NSF)",
    desc: "Approval for foods not having a history of consumption in India, including functional foods, nutraceuticals, and foods for special dietary use.",
    icon: FlaskConical,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    code: "CA",
    title: "Claim Approval (CA) ",
    desc: "Approval for nutrient content claims, health claims, and other product-specific claims on food labels and advertisements.",
    icon: Megaphone,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    code: "AA",
    title: "Ayurveda Aahara (AA)",
    desc: "Approval for use of food additives, enzymes, flavourings, or other substances not specified or beyond the limits in FSS Regulations.",
    icon: Beaker,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    code: "rPET",
    title: "Recycled PET Approvals (rPET)",
    desc: "Approval for use of food-grade recycled PET (polyethylene terephthalate) material in food packaging applications.",
    icon: Recycle,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  {
    code: "Any Other",
    title: "Any Other Category",
    desc: "Applications that do not fall into the above categories but require FSSAI approval under the Food Safety and Standards Act, 2006.",
    icon: MoreHorizontal,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
];

export default function AppCategories({ onOpenPanel }) {
  return (
    <section id="categories" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#1a6e35] text-xs font-semibold uppercase tracking-widest mb-2">Application Types</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-3">Choose Your Application Category</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Select the correct category for your product approval request. Fee structure includes applicable GST as per government norms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.code}
                className={`bg-white rounded-xl border ${cat.border} p-6 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer group`}
                onClick={() => onOpenPanel?.("applicant")}
              >
                <div className="flex items-start justify-between">
                  <div className={`${cat.bg} p-2.5 rounded-lg`}>
                    <Icon size={20} className={cat.color} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {cat.code}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-[#1e3a5f] text-sm mb-2">{cat.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{cat.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
            
                    <p className="text-xs font-bold text-[#1a6e35]">{cat.fee}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${cat.color} group-hover:gap-2 transition-all`}>
                    Apply <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
