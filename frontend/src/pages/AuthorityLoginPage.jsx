import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import api from "../lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthorityLoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const ROLE_ROUTES = {
    NODAL_OFFICER_A: "/nodal/dashboard",
    NODAL_OFFICER_B: "/nodal/dashboard",
    STATE_NODAL_OFFICER: "/nodal/dashboard",
    APPLICANT: "/applicant/dashboard",
  };

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      localStorage.setItem("token", res.data.token);
      const role = res.data.user?.role ?? "";
      navigate(ROLE_ROUTES[role] ?? "/nodal/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0f2440] flex-col justify-between p-12 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)",
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1e3a5f] font-bold text-xs">
              FSSAI
            </div>
            <div>
              <div className="font-bold text-sm">E-PAAS</div>
              <div className="text-blue-300 text-[10px] uppercase tracking-wider">Authority Access</div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            FSSAI Authority<br />Login
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed max-w-sm">
            Restricted access for FSSAI Officers. Use your official government credentials to access the authority portal.
          </p>
        </div>

        <div className="relative">
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm text-blue-200 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2 text-white font-semibold text-xs">
              <ShieldCheck size={14} />
              Restricted Portal
            </div>
            <p className="text-xs leading-relaxed">
              This portal is exclusively for authorised FSSAI officers. Unauthorised access is prohibited under the IT Act, 2000.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-[#ddeef7]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <div className="font-bold text-[#1e3a5f] text-sm">E-PAAS Authority</div>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-[#1e3a5f]" />
              <h2 className="text-xl font-bold text-[#1e3a5f]">Authority Login</h2>
            </div>
            <p className="text-gray-500 text-xs mb-6">FSSAI Officers — use your official credentials</p>

            {serverError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e3a5f] mb-1.5">Official Email ID</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="officer@fssai.gov.in"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
                {errors.email && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e3a5f] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#0f2440] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {isSubmitting ? "Signing in…" : (<><ShieldCheck size={15} /> Authority Sign In</>)}
              </button>
            </form>

            <div className="border-t border-gray-100 mt-6 pt-4 text-center">
              <Link to="/login" className="text-xs text-[#1a6e35] font-medium hover:underline">
                ← Applicant Login
              </Link>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
            Access issues? Contact NIC Helpdesk or your Regional FSSAI IT Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
