import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Leaf, ClipboardCheck, ShieldCheck, CreditCard, Info,
} from "lucide-react";
import ApplicantLayout from "./Layout";
import api from "../../lib/api";

// ── Config ────────────────────────────────────────────────────────────────────

const APP_TYPES = [
  {
    value: "NSF",
    label: "Non Specified Food",
    code: "NSF",
    base: 50000,
    gst: 9000,
    desc: "Novel or non-standardised food products not covered under existing FSSAI regulations.",
    color: "border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    value: "CA",
    label: "Claim Approval",
    code: "CA",
    base: 50000,
    gst: 9000,
    desc: "Health, nutritional or functional claim approval for labelled food products.",
    color: "border-green-200 hover:border-green-400",
    badge: "bg-green-100 text-green-700",
  },
  {
    value: "AA",
    label: "Ayurveda Ahara",
    code: "AA",
    base: 50000,
    gst: 9000,
    desc: "Traditional Ayurvedic food products seeking FSSAI product approval.",
    color: "border-violet-200 hover:border-violet-400",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    value: "Any Other",
    label: "Any Other",
    code: "AOT",
    base: 10000,
    gst: 1800,
    desc: "Approval requests that do not fall under any of the above product categories.",
    color: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-700",
  },
];

const FOOD_CATS = [
  "Dairy & Products", "Beverages", "Bakery & Products", "Fortified Foods",
  "Herbal Products", "Snack Foods", "Health Supplements", "Packaged Foods",
];

const PAYMENT_METHODS = ["NEFT", "RTGS", "Online Banking", "UPI", "Demand Draft"];

const STEPS = [
  { label: "Ingredients",         Icon: Leaf },
  { label: "General Info",        Icon: ClipboardCheck },
  { label: "Regulatory & Safety", Icon: ShieldCheck },
  { label: "Payment & Submit",    Icon: CreditCard },
];

const STEP_HINTS = [
  "List all ingredients and food additives used in the product. Ensure additives are FSS-compliant.",
  "Provide organisation details, contact information, and FSSAI licence number.",
  "Attach regulatory status documents, safety studies, labels, and GST number.",
  "Review the fee summary and provide payment transaction reference before submitting.",
];

// ── Field helpers ─────────────────────────────────────────────────────────────

function FL({ children }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1.5">{children}</label>;
}

const ic = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-colors";

function Input({ label, ...props }) {
  return <div><FL>{label}</FL><input {...props} className={ic} /></div>;
}

function Textarea({ label, rows = 3, ...props }) {
  return <div><FL>{label}</FL><textarea rows={rows} {...props} className={ic + " resize-none"} /></div>;
}

function Select({ label, children, ...props }) {
  return (
    <div>
      <FL>{label}</FL>
      <select {...props} className={ic + " bg-white"}>{children}</select>
    </div>
  );
}

function FileInput({ label, hint }) {
  return (
    <div>
      <FL>{label}</FL>
      <input type="file"
        className="w-full text-xs border border-dashed border-gray-300 rounded-lg px-3 py-2.5 file:mr-3 file:text-xs file:font-semibold file:bg-black file:text-white file:border-0 file:rounded file:px-2.5 file:py-1 hover:border-gray-400 cursor-pointer transition-colors" />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Step content ──────────────────────────────────────────────────────────────

function Step1({ form, set }) {
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <Textarea
          label="Ingredients"
          rows={7}
          placeholder="List all ingredients in descending order of weight (e.g. Wheat flour, Sugar, Salt, Edible vegetable oil…)"
          value={form.ingredients}
          onChange={(e) => set("ingredients", e.target.value)}
        />
        <Textarea
          label="Food Additives"
          rows={7}
          placeholder="List additives with INS number and quantity (e.g. INS 211 Sodium Benzoate — 250 mg/kg; INS 330 Citric Acid — 500 mg/kg)"
          value={form.additives}
          onChange={(e) => set("additives", e.target.value)}
        />
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex gap-3">
        <AlertCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Ensure all additives are permitted under FSS (Food Products Standards and Food Additives) Regulations, 2011 before submitting.
        </p>
      </div>
    </div>
  );
}

function Step2({ form, set }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input label="Product Name" placeholder="e.g. ProGut Probiotic Blend" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
        <Select label="Food Category" value={form.food_category} onChange={(e) => set("food_category", e.target.value)}>
          <option value="">-- Select category --</option>
          {FOOD_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="FSSAI Licence No." placeholder="e.g. 10012345000123" value={form.license_no} onChange={(e) => set("license_no", e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input label="Organisation / Company Name" placeholder="Full legal name" value={form.organization_name} onChange={(e) => set("organization_name", e.target.value)} />
        <Input label="Authorised Person" placeholder="Name of authorised signatory" value={form.authorized_person} onChange={(e) => set("authorized_person", e.target.value)} />
        <Input label="Mobile Number" placeholder="10-digit mobile number" value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Contact Email" type="email" placeholder="business@example.com" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        <Input label="GST Number" placeholder="e.g. 29ABCDE1234F1Z5" value={form.gst_no} onChange={(e) => set("gst_no", e.target.value)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Textarea label="Registered Address" rows={2} placeholder="Full registered address with pincode" value={form.address} onChange={(e) => set("address", e.target.value)} />
        <Textarea label="Manufacturing Address" rows={2} placeholder="Manufacturing unit address (if different from above)" value={form.manufacturing_address} onChange={(e) => set("manufacturing_address", e.target.value)} />
      </div>
    </div>
  );
}

function Step3({ form, set }) {
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Textarea
            label="Regulatory Status"
            rows={4}
            placeholder="Describe the regulatory status of the product in India and/or internationally…"
            value={form.regulatory_status_text}
            onChange={(e) => set("regulatory_status_text", e.target.value)}
          />
          <FileInput label="Regulatory Status Document" hint="PDF, max 5 MB" />
        </div>
        <div className="space-y-3">
          <Textarea
            label="Safety Information"
            rows={4}
            placeholder="Summarise safety studies, GRAS status, or other safety evidence…"
            value={form.safety_info}
            onChange={(e) => set("safety_info", e.target.value)}
          />
          <FileInput label="Safety Data Document" hint="PDF, max 5 MB" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FileInput label="Label Upload (Front & Back)" hint="PDF/PNG, max 5 MB" />
        <FileInput label="Claim Support Document" hint="Evidence for any product claims" />
        <FileInput label="Surveillance / Study Report" hint="Optional — clinical or safety study" />
      </div>
    </div>
  );
}

function Step4({ form, set, appType, submitting, error, onSubmit }) {
  const baseAmt = appType?.base ?? 0;
  const gstAmt  = appType?.gst  ?? 0;
  const total   = baseAmt + gstAmt;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fee summary */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Fee Summary</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">Application Fee ({appType?.label})</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{baseAmt.toLocaleString("en-IN")}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">GST @ 18%</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{gstAmt.toLocaleString("en-IN")}</td>
                </tr>
                <tr className="bg-black/5">
                  <td className="px-4 py-3 font-bold text-black">Total Payable</td>
                  <td className="px-4 py-3 text-right font-bold text-black text-base">₹{total.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3">
            <Select label="Payment Method" value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              <option value="">-- Select method --</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Input
              label="Transaction Reference No."
              placeholder="Bank transaction / UTR reference number"
              value={form.payment_reference}
              onChange={(e) => set("payment_reference", e.target.value)}
            />
            <FileInput label="Payment Proof / Challan" hint="Bank receipt or UTR screenshot, PDF/PNG" />
          </div>
        </div>

        {/* Declaration + submit */}
        <div className="flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-4">
            <input
              type="checkbox"
              id="declaration"
              className="mt-0.5 flex-shrink-0 accent-black w-4 h-4"
              checked={form.declaration}
              onChange={(e) => set("declaration", e.target.checked)}
            />
            <label htmlFor="declaration" className="text-xs text-amber-800 leading-relaxed cursor-pointer">
              I declare that all information provided in this application is true and correct to the best of my knowledge. I understand that any false information may result in rejection or withdrawal of approval under FSSAI regulations.
            </label>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-xs text-gray-500 space-y-1.5">
            <p className="font-semibold text-gray-700 flex items-center gap-1.5"><Info size={13} /> What happens next?</p>
            <p>1. Application is submitted to the Nodal Officer for initial scrutiny.</p>
            <p>2. You will receive queries or a decision within the prescribed timeline.</p>
            <p>3. Track status in real-time from your Dashboard.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full bg-black hover:bg-white hover:text-black border border-black disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting ? "Submitting Application…" : <><CheckCircle2 size={16} /> Submit Application</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  ingredients: "", additives: "",
  product_name: "", food_category: "", organization_name: "", authorized_person: "",
  mobile_number: "", contact_email: "", address: "", manufacturing_address: "", license_no: "",
  regulatory_status_text: "", safety_info: "", gst_no: "",
  payment_method: "", payment_reference: "", declaration: false,
};

function NewApplicationContent() {
  const navigate             = useNavigate();
  const [appType, setAppType]     = useState(null);
  const [step, setStep]           = useState(0);
  const [form, setFormState]      = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const set  = (key, val) => setFormState((f) => ({ ...f, [key]: val }));
  const next = () => { setError(""); setStep((s) => s + 1); };
  const prev = () => { setError(""); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        app_type:               appType.value,
        product_name:           form.product_name          || undefined,
        food_category:          form.food_category         || undefined,
        organization_name:      form.organization_name     || undefined,
        authorized_person:      form.authorized_person     || undefined,
        mobile_number:          form.mobile_number         || undefined,
        contact_email:          form.contact_email         || undefined,
        address:                form.address               || undefined,
        manufacturing_address:  form.manufacturing_address || undefined,
        license_no:             form.license_no            || undefined,
        ingredients:            (form.ingredients || form.additives)
          ? `${form.ingredients}\n\nAdditives:\n${form.additives}`.trim()
          : undefined,
        regulatory_status_text: form.regulatory_status_text || undefined,
        safety_info:            form.safety_info            || undefined,
        gst_no:                 form.gst_no                 || undefined,
        payment_reference:      form.payment_reference      || undefined,
      };

      const { data: created } = await api.post("/applications", payload);
      await api.post(`/applications/${created.data.id}/submit`);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.message ?? "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  // ── Type selection ─────────────────────────────────────────────────────────

  if (!appType) return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-black">Select Application Type</h2>
        <p className="text-sm text-gray-500 mt-1">Choose the category that best describes your product to proceed with the approval workflow.</p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {APP_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { setAppType(t); setStep(1); }}
            className={`text-left bg-white border-2 ${t.color} rounded-xl p-5 hover:shadow-md transition-all group`}
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg ${t.badge}`}>{t.code}</span>
              <span className="text-sm font-bold text-black">₹{(t.base / 1000).toFixed(0)}k + GST</span>
            </div>
            <h4 className="font-bold text-black text-sm mb-2 group-hover:text-black transition-colors">{t.label}</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">{t.desc}</p>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-black group-hover:text-black transition-colors">
              Proceed <ChevronRight size={13} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step form ──────────────────────────────────────────────────────────────

  const currentStep = STEPS[step - 1];

  return (
    <div className="p-6 flex flex-col gap-5">

      {/* Top bar: progress + step info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Step tabs */}
          <div className="flex gap-1 flex-1">
            {STEPS.map((s, i) => {
              const idx = i + 1;
              const done    = idx < step;
              const active  = idx === step;
              return (
                <div key={s.label} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-1 justify-center ${
                    active ? "bg-[#39B5E0] text-white" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {done ? <CheckCircle2 size={13} /> : <s.Icon size={13} />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{idx}</span>
                  </div>
                  {idx < 4 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
          <span className="text-xs font-bold text-white bg-black px-3 py-1.5 rounded-full flex-shrink-0">{appType.code} — {appType.label}</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-[#39B5E0]" : "bg-gray-100"}`} />
          ))}
        </div>
      </div>

      {/* Main content: form card + side hint */}
      <div className="flex gap-5 items-start">

        {/* Form card */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6 min-w-0">
          <h3 className="text-base font-bold text-black mb-0.5">{currentStep?.label}</h3>
          <p className="text-xs text-gray-400 mb-5">{STEP_HINTS[step - 1]}</p>

          {step === 1 && <Step1 form={form} set={set} />}
          {step === 2 && <Step2 form={form} set={set} />}
          {step === 3 && <Step3 form={form} set={set} />}
          {step === 4 && (
            <Step4 form={form} set={set} appType={appType}
              submitting={submitting} error={error} onSubmit={handleSubmit} />
          )}

          {error && step < 4 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-5">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Side panel (hidden on small screens) */}
        <div className="w-64 hidden xl:flex flex-col gap-3 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Application Summary</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-semibold text-black">{appType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Base Fee</span>
                <span className="font-semibold text-gray-700">₹{appType.base.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST (18%)</span>
                <span className="font-semibold text-gray-700">₹{appType.gst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-bold text-black">Total</span>
                <span className="font-bold text-black">₹{(appType.base + appType.gst).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
            <p className="font-semibold text-blue-800 flex items-center gap-1.5"><Info size={12} /> Step {step} of 4</p>
            <p className="leading-relaxed">{STEP_HINTS[step - 1]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={step === 1 ? () => { setAppType(null); setStep(0); } : prev}
          className="flex items-center gap-1.5 border border-black text-black hover:bg-black hover:text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <ChevronLeft size={16} /> {step === 1 ? "Change Type" : "Previous"}
        </button>
        {step < 4 && (
          <button
            onClick={next}
            className="flex items-center gap-1.5 bg-black hover:bg-white hover:text-black border border-black text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Next Step <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewApplication() {
  return (
    <ApplicantLayout pageTitle="New Application">
      <NewApplicationContent />
    </ApplicantLayout>
  );
}
