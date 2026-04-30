import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";

export default function Navbar({ onOpenPanel }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src="../public/logo.png"
              alt="FSSAI Logo"
              className="h-30 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link to="/" className="hover:text-[#39B5E0] transition-colors">Home</Link>
            <a href="#categories" className="hover:text-[#39B5E0] transition-colors">Applications</a>
            <a href="#how-it-works" className="hover:text-[#39B5E0] transition-colors">Process</a>
            <a href="#circulars" className="hover:text-[#39B5E0] transition-colors">Circulars</a>
            <a href="#quick-links" className="hover:text-[#39B5E0] transition-colors">Quick Links</a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-semibold text-[#39B5E0] border border-[#000] px-4 py-2 rounded-md hover:bg-[#39B5E0] hover:text-white transition-colors">
                Login <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <button
                  onClick={() => onOpenPanel?.("applicant")}
                  className="w-full text-left block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#eef6fb] hover:text-[#39B5E0] font-medium"
                >
                  Applicant Login
                </button>
                <button
                  onClick={() => onOpenPanel?.("authority")}
                  className="w-full text-left block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#eef6fb] hover:text-[#39B5E0] font-medium border-t border-gray-50"
                >
                  Authority Login
                </button>
              </div>
            </div>
            <button
              onClick={() => onOpenPanel?.("signup")}
              className="text-sm font-semibold bg-[#000] text-white px-4 py-2 rounded-md hover:bg-[#39B5E0] transition-colors"
            >
              Register
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-600 hover:text-[#1a6e35]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3 text-sm font-medium text-gray-700">
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <a href="#categories" onClick={() => setMobileOpen(false)}>Applications</a>
          <a href="#how-it-works" onClick={() => setMobileOpen(false)}>Process</a>
          <a href="#circulars" onClick={() => setMobileOpen(false)}>Circulars</a>
          <a href="#quick-links" onClick={() => setMobileOpen(false)}>Quick Links</a>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            <button
              onClick={() => { onOpenPanel?.("applicant"); setMobileOpen(false); }}
              className="text-center border border-[#5B7FC4] text-[#5B7FC4] px-4 py-2 rounded-md font-semibold"
            >
              Applicant Login
            </button>
            <button
              onClick={() => { onOpenPanel?.("authority"); setMobileOpen(false); }}
              className="text-center border border-[#5B7FC4] text-[#5B7FC4] px-4 py-2 rounded-md font-semibold"
            >
              Authority Login
            </button>
            <button
              onClick={() => { onOpenPanel?.("signup"); setMobileOpen(false); }}
              className="text-center bg-[#1a6e35] text-white px-4 py-2 rounded-md font-semibold"
            >
              Register
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}