import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Eye, EyeOff, LogIn, ShieldCheck, UserPlus, AlertCircle, CheckCircle,
} from "lucide-react";
import api from "../../lib/api";

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  username:           z.string().min(2, "Name must be at least 2 characters"),
  mobile_number:      z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email:              z.string().email("Enter a valid email address"),
  organization_name:  z.string().min(2, "Organisation name is required"),
  nature_of_business: z.string().min(1, "Select nature of business"),
  password:           z.string().min(8, "Password must be at least 8 characters"),
  confirm_password:   z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match", path: ["confirm_password"],
});

// ── Shared field components ───────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#000] mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (accent = "green") =>
  `w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none ${
    accent === "green"
      ? "focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]/20"
      : "focus:border-[#5B7FC4] focus:ring-1 focus:ring-[#5B7FC4]/20"
  }`;

// ── Applicant Login Form ──────────────────────────────────────────────────────

function ApplicantLoginForm({ onSwitch }) {
  const navigate     = useNavigate();
  const [show, setShow]         = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(loginSchema) });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="flex-shrink-0" /> {serverError}
        </div>
      )}

      <Field label="Username" error={errors.email?.message}>
        <input type="email" {...register("email")} placeholder="you@example.com" className={inputCls("green")} />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <input type={show ? "text" : "password"} {...register("password")} placeholder="••••••••"
            className={inputCls("green") + " pr-10"} />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
          <input type="checkbox" className="rounded accent-[#1a6e35]" /> Remember me
        </label>
        <a href="#" className="text-[#39B5E0] font-semibold hover:underline">Forgot Password?</a>
      </div>
      <br />
      <br />
      <button type="submit" disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-[#39B5E0] hover:bg-[#16304f] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
        {isSubmitting ? "Signing in…" : <><LogIn size={15} /> Login to E-PAAS &rarr;</>}
      </button>

      <p className="text-center text-xs text-gray-500">
        New to E-PAAS?{" "}
        <button type="button" onClick={() => onSwitch("signup")} className="text-[#39B5E0] font-semibold hover:underline">
          Create an account &rarr;
        </button>
      </p>
      <p className="text-center text-xs">
        <button type="button" onClick={() => onSwitch("authority")} className="text-[#000] font-medium hover:underline">
          Authority Officer? Login here &rarr;
        </button>
      </p>
    </form>
  );
}

// ── Authority Login Form ──────────────────────────────────────────────────────

function AuthorityLoginForm({ onSwitch }) {
  const navigate     = useNavigate();
  const [show, setShow]         = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      localStorage.setItem("token", res.data.token);
      const ROLE_ROUTES = {
        Applicant: "/applicant/dashboard",
        ApplicantRPET: "/applicant/dashboard",
        NodalOfficerA: "/nodal/dashboard",
        NodalOfficerARPET: "/nodal/dashboard",
        NodalPointB: "/nodal/dashboard",
        TechnicalOfficer: "/technical/dashboard",
        TechnicalOfficerRPET: "/technical/dashboard",
        ExpertCommittee: "/expert/dashboard",
        APPLICANT: "/applicant/dashboard",
        NODAL_OFFICER_A: "/nodal/dashboard",
        NODAL_OFFICER_B: "/nodal/dashboard",
        TECHNICAL_OFFICER: "/technical/dashboard",
        EXPERT_COMMITTEE: "/expert/dashboard",
        STATE_NODAL_OFFICER: "/nodal/dashboard",
      };
      navigate(ROLE_ROUTES[res.data.user?.role] ?? "/nodal/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="flex-shrink-0" /> {serverError}
        </div>
      )}

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-[11px] text-bg-[#39B5E0]">
        <ShieldCheck size={13} className="flex-shrink-0 mt-0.5 text-blue-500" />
        Restricted portal — for authorised FSSAI Officers only. Unauthorised access is prohibited.
      </div>

      <Field label="Username" error={errors.email?.message}>
        <input type="text" {...register("email")} placeholder="officer@fssai.gov.in" className={inputCls("navy")} />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <input type={show ? "text" : "password"} {...register("password")} placeholder="••••••••"
            className={inputCls("navy") + " pr-10"} />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>

      <button type="submit" disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-[#39B5E0] hover:bg-[#0f2440] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
        {isSubmitting ? "Signing in…" : <><ShieldCheck size={15} /> Authority Sign In</>}
      </button>

      <p className="text-center text-xs text-[10px] text-gray-400">
        Access issues? Contact NIC Helpdesk or your Regional FSSAI IT Administrator.
      </p>

      <p className="text-center text-xs">
        <button type="button" onClick={() => onSwitch("applicant")} className="text-[#000] font-medium hover:underline">
          &larr; Back to Applicant Login
        </button>
      </p>
    </form>
  );
}

// ── Signup Form ───────────────────────────────────────────────────────────────

function SignupForm({ onSwitch }) {
  const navigate     = useNavigate();
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const res = await api.post("/auth/signup", {
        username: data.username,
        email:    data.email,
        password: data.password,
      });
      localStorage.setItem("token", res.data.token);
      navigate("/applicant/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="flex-shrink-0" /> {serverError}
        </div>
      )}

      <Field label="Name" error={errors.username?.message}>
        <input type="text" {...register("username")} placeholder="Full name of contact person" className={inputCls("green")} />
      </Field>

      <Field label="Mobile Number" error={errors.mobile_number?.message}>
        <div className="flex">
          <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-xs font-medium">+91</span>
          <input type="tel" {...register("mobile_number")} placeholder="9876543210" maxLength={10}
            className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1a6e35] focus:ring-1 focus:ring-[#1a6e35]/20" />
        </div>
      </Field>

      <Field label="Email ID" error={errors.email?.message}>
        <input type="email" {...register("email")} placeholder="you@example.com" className={inputCls("green")} />
      </Field>

      <Field label="Name of Organisation" error={errors.organization_name?.message}>
        <input type="text" {...register("organization_name")} placeholder="ABC Foods Pvt. Ltd." className={inputCls("green")} />
      </Field>

      <Field label="Nature of Business" error={errors.nature_of_business?.message}>
        <select {...register("nature_of_business")} className={inputCls("green") + " bg-white"}>
          <option value="">Select nature of business</option>
          <option>Manufacturer</option>
          <option>Importer</option>
          <option>Exporter</option>
          <option>Trader / Distributor</option>
          <option>Retailer</option>
          <option>Research &amp; Development</option>
          <option>Other</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input type={showPass ? "text" : "password"} {...register("password")} placeholder="Min. 8 chars"
              className={inputCls("green") + " pr-9"} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password" error={errors.confirm_password?.message}>
          <div className="relative">
            <input type={showConfirm ? "text" : "password"} {...register("confirm_password")} placeholder="Re-enter"
              className={inputCls("green") + " pr-9"} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed">
        By registering, you agree to the{" "}
        <a href="#" className="text-[#39B5E0] hover:underline">Terms of Use</a> and{" "}
        <a href="#" className="text-[#39B5E0] hover:underline">Privacy Policy</a> of FSSAI E-PAAS.
      </p>

      <button type="submit" disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-[#39B5E0] hover:bg-[#000] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
        {isSubmitting ? "Creating Account…" : <><UserPlus size={15} /> Create Account</>}
      </button>

      <p className="text-center text-xs text-gray-500">
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("applicant")} className="text-[#39B5E0] font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Panel shell ───────────────────────────────────────────────────────────────

const PANEL_META = {
  applicant: { breadcrumb: "APPLICANT ACCESS · FSSAI E-PAAS", title: "Applicant Login" },
  authority: { breadcrumb: "AUTHORITY ACCESS · FSSAI E-PAAS", title: "Authority Login" },
  signup:    { breadcrumb: "APPLICANT ACCESS · FSSAI E-PAAS", title: "Create Account" },
};

export default function AuthPanel({ mode, onClose, onSwitch }) {
  const isOpen = !!mode;
  const meta   = PANEL_META[mode] ?? PANEL_META.applicant;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Panel header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{meta.breadcrumb}</p>
              <h2 className="text-xl font-bold text-[#000]">{meta.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {mode === "signup"
                  ? "Fill in your details to get started."
                  : "Enter your credentials to manage your food product approvals."}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>

          {/* Login type tabs (only for login modes) */}
          {(mode === "applicant" || mode === "authority") && (
            <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
              <button onClick={() => onSwitch("applicant")}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "applicant" ? "bg-white text-[#000] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Applicant
              </button>
              <button onClick={() => onSwitch("authority")}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "authority" ? "bg-white text-[#000] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Authority Officer
              </button>
            </div>
          )}
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === "applicant" && <ApplicantLoginForm onSwitch={onSwitch} />}
          {mode === "authority" && <AuthorityLoginForm onSwitch={onSwitch} />}
          {mode === "signup"    && <SignupForm onSwitch={onSwitch} />}
        </div>
      </div>
    </>
  );
}
