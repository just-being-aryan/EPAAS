import { Link } from "react-router-dom";
import { Phone, Mail, Globe, MapPin, Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1e3a5f] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/whitelogo.png?v=1" alt="" width={120} height={120} />
              <div className="leading-tight">
                <div className="font-bold text-sm">E-PAAS</div>
                <div className="text-blue-200 text-[10px] uppercase tracking-wider">Product Approval</div>
              </div>
            </div>
            <p className="text-blue-200 text-xs leading-relaxed">
              The Food Safety and Standards Authority of India (FSSAI) is an autonomous body under the Ministry of Health &amp; Family Welfare, Government of India. E-PAAS is the official digital platform for prior product approval applications.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Important Links</h4>
            <ul className="space-y-2 text-xs text-blue-200">
              <li><a href="https://www.fssai.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Food Safety And Standards Authority Of India</a></li>
              <li><a href="https://foscos.fssai.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Food Safety Compliance System</a></li>
              <li><a href="https://fics.fssai.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Food Import Clearance System</a></li>
            </ul>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Additional Information</h4>
            <ul className="space-y-2 text-xs text-blue-200">
              <li><a href="#" className="hover:text-white transition-colors">User Manual</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Application Forms</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Fee Schedule</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Video Tutorials</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Grievance Portal</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Contact</h4>
            <ul className="space-y-2 text-xs text-blue-200">
              <li className="flex items-start gap-2">
                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                <span>FDA Bhawan, Kotla Road, New Delhi – 110002</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={12} className="flex-shrink-0" />
                <span>+91-11-23236975</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={12} className="flex-shrink-0" />
                <span>fssai.helpdesk@fssai.gov.in</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={12} className="flex-shrink-0" />
                <span>www.fssai.gov.in</span>
              </li>
              <li className="flex items-start gap-2 mt-3">
                <Clock size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  Mon–Fri: 09:00–18:00 IST<br />
                  Sat: 09:00–13:00 IST
                </span>
              </li>
              <li className="text-white font-bold text-sm mt-1">
                1800-112-100
                <span className="block text-blue-200 font-normal text-[10px]">Toll-free helpline</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-blue-300">
          <p>© {new Date().getFullYear()} Food Safety and Standards Authority of India · Ministry of Health &amp; Family Welfare, Government of India</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
            <a href="#" className="hover:text-white transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}