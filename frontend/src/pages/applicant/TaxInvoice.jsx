import { useEffect, useState } from "react";
import { Search, Download, Receipt, Eye } from "lucide-react";
import ApplicantLayout from "./Layout";
import api from "../../lib/api";

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PaymentBadge({ status }) {
  const MAP = {
    paid:    "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    failed:  "bg-red-100 text-red-700 border-red-200",
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${MAP[status] ?? "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
      {label}
    </span>
  );
}

function PageContent() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    api.get("/applications/invoices")
      .then((r) => setInvoices(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = search
    ? invoices.filter((inv) =>
        inv.reference_no?.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
        inv.organization_name?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-black text-sm">Tax Invoices & Payments</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {displayed.length} invoice{displayed.length !== 1 ? "s" : ""} — GST-compliant tax invoices for submitted applications
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reference, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-52 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="py-14 text-center">
            <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No invoices yet</p>
            <p className="text-gray-400 text-xs mt-1">Invoices are generated after application submission.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-gray-50">
                  {["SR.", "Application Ref.", "Invoice No.", "Company", "App. Type", "Amount (₹)", "Invoice Date", "Payment Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((inv, i) => (
                  <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-400 text-center">{i + 1}</td>
                    <td className="px-4 py-3 border-b border-gray-50">
                      <span className="font-mono text-[11px] text-gray-700">{inv.reference_no ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-50">
                      <span className="font-mono text-[11px] text-black font-semibold">{inv.invoice_no ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-50 font-medium text-black max-w-[160px] truncate">{inv.organization_name ?? "—"}</td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-700 whitespace-nowrap">{inv.app_type}</td>
                    <td className="px-4 py-3 border-b border-gray-50 font-semibold text-gray-800 whitespace-nowrap">
                      {inv.fee_amount ? `₹${Number(inv.fee_amount).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-50 text-gray-500 whitespace-nowrap">{fmt(inv.submitted_at)}</td>
                    <td className="px-4 py-3 border-b border-gray-50"><PaymentBadge status={inv.payment_status} /></td>
                    <td className="px-4 py-3 border-b border-gray-50">
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-black hover:bg-white hover:text-black border border-black text-white transition-colors whitespace-nowrap">
                          <Download size={11} /> PDF
                        </button>
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors">
                          <Eye size={11} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaxInvoice() {
  return (
    <ApplicantLayout pageTitle="Tax Invoice / Payments">
      <PageContent />
    </ApplicantLayout>
  );
}
