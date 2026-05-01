import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import api from "../lib/api";

const schema = z.object({
  username: z.string().min(2, "Name must be at least 2 characters"),
  mobile_number: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().email("Enter a valid email address"),
  organization_name: z.string().min(2, "Organisation name is required"),
  nature_of_business: z.string().min(1, "Select nature of business"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export default function SignupPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      const res = await api.post("/auth/signup", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      localStorage.setItem("token", res.data.token);
      navigate("/applicant/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#0f4023] via-[#1a6e35] to-[#1e3a5f] flex-col justify-between p-12 text-white relative overflow-hidden">
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
            Register as<br />an Applicant
          </h1>
          <p className="text-green-100 text-sm leading-relaxed max-w-sm">
            Create your E-PAAS account to start submitting product approval requests to FSSAI.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            "Free registration — no charges",
            "Submit applications for all product types",
            "Real-time tracking & status updates",
            "Download certificates directly from portal",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-green-100">
              <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-3/5 flex items-center justify-center py-8 px-6 bg-[#ddeef7] overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-full bg-[#1a6e35] flex items-center justify-center text-white font-bold text-xs">F</div>
            <div className="font-bold text-[#1a6e35] text-sm">E-PAAS</div>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create Account</h2>
            <p className="text-gray-500 text-xs mb-6">All fields are required for registration</p>

            {serverError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Name</label>
                <input
                  type="text"
                  {...register("username")}
                  placeholder="Full name of contact person"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                />
                {errors.username && <p className="text-red-500 text-[11px] mt-1">{errors.username.message}</p>}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Mobile Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-xs font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    {...register("mobile_number")}
                    placeholder="9876543210"
                    maxLength={10}
                    className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                  />
                </div>
                {errors.mobile_number && <p className="text-red-500 text-[11px] mt-1">{errors.mobile_number.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Email ID</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                />
                {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email.message}</p>}
              </div>

              {/* Organisation Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Name of Organisation</label>
                <input
                  type="text"
                  {...register("organization_name")}
                  placeholder="ABC Foods Pvt. Ltd."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                />
                {errors.organization_name && <p className="text-red-500 text-[11px] mt-1">{errors.organization_name.message}</p>}
              </div>

              {/* Nature of Business */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Nature of Business</label>
                <select
                  {...register("nature_of_business")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35] bg-white"
                >
                  <option value="">Select nature of business</option>
                  <option>Manufacturer</option>
                  <option>Importer</option>
                  <option>Exporter</option>
                  <option>Trader / Distributor</option>
                  <option>Retailer</option>
                  <option>Research &amp; Development</option>
                  <option>Other</option>
                </select>
                {errors.nature_of_business && <p className="text-red-500 text-[11px] mt-1">{errors.nature_of_business.message}</p>}
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      {...register("password")}
                      placeholder="Min. 8 characters"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      {...register("confirm_password")}
                      placeholder="Re-enter password"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-red-500 text-[11px] mt-1">{errors.confirm_password.message}</p>}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 leading-relaxed">
                By registering, you agree to the{" "}
                <a href="#" className="text-[#1a6e35] hover:underline">Terms of Use</a>
                {" "}and{" "}
                <a href="#" className="text-[#1a6e35] hover:underline">Privacy Policy</a>
                {" "}of FSSAI E-PAAS.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#39B5E0] hover:bg-[#2aa0c8] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {isSubmitting ? "Creating Account…" : (<><UserPlus size={15} /> Create Account</>)}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-5">
              Already have an account?{" "}
              <Link to="/login" className="text-[#1a6e35] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}