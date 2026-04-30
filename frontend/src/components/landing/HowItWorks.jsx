import { UserPlus, FileText, CreditCard, ClipboardCheck, Users, Award } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Register & Login",
    desc: "Create an account on E-PAAS using your business email and FSSAI license details. Verify your account to begin.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: FileText,
    title: "Fill Application",
    desc: "Complete the application form with product details, ingredients, regulatory status, and required supporting documents.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: CreditCard,
    title: "Pay Application Fee",
    desc: "Pay the prescribed fee online via government payment gateway. An invoice is generated immediately upon payment.",
    color: "bg-violet-100 text-violet-600",
  },
  {
    icon: ClipboardCheck,
    title: "Document Scrutiny",
    desc: "FSSAI officers verify your documents for completeness and compliance. Queries, if any, are raised through the portal.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: Users,
    title: "Expert Committee Review",
    desc: "The application is placed before the Scientific Expert Committee for technical evaluation and deliberation.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Award,
    title: "Decision & Certificate",
    desc: "Upon EC approval, a formal approval letter is issued. You can download the certificate directly from the portal.",
    color: "bg-teal-100 text-teal-600",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#1a6e35] text-xs font-semibold uppercase tracking-widest mb-2">Process</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-3">How It Works</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            A transparent, end-to-end digital process from application submission to final approval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${step.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1e3a5f] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1e3a5f] text-sm mb-1.5">{step.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
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
