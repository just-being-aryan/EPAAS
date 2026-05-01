import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import api from "../lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      localStorage.setItem("token", res.data.token);
      navigate("/applicant/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f4023] via-[#1a6e35] to-[#1e3a5f] flex-col justify-between p-12 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)",
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1a6e35] font-bold text-xs">
              FSSAI
            </div>
            <div>
              <div className="font-bold text-sm">E-PAAS</div>
              <div className="text-green-300 text-[10px] uppercase tracking-wider">Product Approval Portal</div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Welcome Back,<br />Applicant
          </h1>
          <p className="text-green-100 text-sm leading-relaxed max-w-sm">
            Log in to manage your product approval applications, track their progress, and download certificates.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            "Submit and track applications in real-time",
            "Respond to queries from FSSAI officers",
            "Download invoices and approval certificates",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-green-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-[#ddeef7]">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-[#1a6e35] flex items-center justify-center text-white font-bold text-xs">
              F
            </div>
            <div className="font-bold text-[#1a6e35] text-sm">E-PAAS</div>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">Applicant Login</h2>
            <p className="text-gray-500 text-xs mb-6">Enter your registered email and password</p>

            {serverError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <label className="block text-xs font-semibold text-[#1e3a5f] mb-1.5">Email Address</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
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

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <a href="#" className="text-[#1a6e35] font-semibold hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#1a6e35] hover:bg-[#145228] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {isSubmitting ? "Signing in…" : (<><LogIn size={15} /> Sign In</>)}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#1a6e35] font-semibold hover:underline">
                Register here
              </Link>
            </p>

            <div className="border-t border-gray-100 mt-6 pt-4 text-center">
              <Link to="/authority/login" className="text-xs text-[#1e3a5f] font-medium hover:underline">
                Login as FSSAI Authority →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
