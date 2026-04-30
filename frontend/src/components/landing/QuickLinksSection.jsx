import { ExternalLink } from "lucide-react";

const LINKS = [
  {
    category: "FSSAI Portals",
    items: [
      { name: "FSSAI Official Website", url: "https://fssai.gov.in" },
      { name: "FoSCoS — Licensing & Registration", url: "https://foscos.fssai.gov.in" },
      { name: "FSSAI Food Safety Connect", url: "https://fssai.gov.in/fsc" },
      { name: "FSSAI Training & Certification", url: "https://flrs.fssai.gov.in" },
    ],
  },
  {
    category: "Regulations & Standards",
    items: [
      { name: "FSS Act, 2006", url: "https://fssai.gov.in/upload/uploadfiles/files/Food_Safety_Standard_Act_of_2006.pdf" },
      { name: "FSS Regulations 2011 (onwards)", url: "https://fssai.gov.in/home/fss-legislation/fss-regulations.html" },
      { name: "Food Safety Gazette Notifications", url: "https://fssai.gov.in/home/fss-legislation/gazette-notifications.html" },
      { name: "Novel Food Guidelines", url: "https://fssai.gov.in" },
    ],
  },
  {
    category: "Government Services",
    items: [
      { name: "National Single Window System", url: "https://nsws.gov.in" },
      { name: "e-Sanjeevani Portal", url: "https://esanjeevaniopd.in" },
      { name: "MyGov India", url: "https://mygov.in" },
      { name: "Digital India", url: "https://digitalindia.gov.in" },
    ],
  },
  {
    category: "Support & Resources",
    items: [
      { name: "E-PAAS User Manual", url: "#" },
      { name: "Application Checklist", url: "#" },
      { name: "Fee Calculator", url: "#" },
      { name: "Helpdesk & FAQs", url: "#" },
    ],
  },
];

export default function QuickLinksSection() {
  return (
    <section id="quick-links" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[#1a6e35] text-xs font-semibold uppercase tracking-widest mb-2">Resources</p>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Quick Links</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {LINKS.map((group) => (
            <div key={group.category} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-[#1e3a5f] text-xs uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
                {group.category}
              </h3>
              <ul className="space-y-2.5">
                {group.items.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-xs text-gray-600 hover:text-[#1a6e35] transition-colors group"
                    >
                      <ExternalLink
                        size={11}
                        className="mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-[#1a6e35]"
                      />
                      <span>{link.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
