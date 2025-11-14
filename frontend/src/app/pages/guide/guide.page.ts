import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="container">
    <h4 class="mb-3">Guide: How to use this application</h4>
    <p class="text-muted">A quick, step‑by‑step walkthrough of each screen.</p>

    <div class="mb-4">
      <h5>1) Register / Login</h5>
      <ul>
        <li>Register with your email, password, shop name, state code (e.g. KA), and optional GSTIN.</li>
        <li>Login to access the dashboard and all features.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>2) Settings</h5>
      <ul>
        <li>Update your company profile: name, address, state code, GSTIN.</li>
        <li>Ensure state code and GSTIN are correct; they decide CGST/SGST versus IGST in tax split.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>3) Products</h5>
      <ul>
        <li>Add products with price, GST %, unit, HSN (optional), and opening quantity.</li>
        <li>Opening quantity is your initial stock on hand.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>4) Customers</h5>
      <ul>
        <li>Add customers. Include GSTIN for B2B supplies and accurate tax classification.</li>
        <li>Use search to quickly find/edit customers when invoicing.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>5) Purchases (Stock In)</h5>
      <ul>
        <li>Create a new purchase entry when you buy stock.</li>
        <li>Enter Vendor Name; optionally add Vendor GSTIN and State for accurate ITC split (CGST/SGST vs IGST).</li>
        <li>Add items using typeahead; quantities increase stock. Totals and tax compute automatically.</li>
        <li>Use "Record Payment" to track paid vs due for suppliers (Accounts Payable).</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>6) Invoices (Sales)</h5>
      <ul>
        <li>Open Invoices. Use customer search (or Walk‑in) and add items via typeahead.</li>
        <li>Tax split applies automatically: intra‑state → CGST+SGST; inter‑state → IGST.</li>
        <li>Save invoice, download PDF, and use list filters (search/date) with pagination.</li>
        <li>Use "Mark Paid" or partial payment from Receivables to track dues (Accounts Receivable).</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>7) Stock</h5>
      <ul>
        <li>View opening, purchased, sold, and on‑hand quantities per product.</li>
        <li>Export CSV for offline analysis.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>8) Reports</h5>
      <ul>
        <li>Sales Summary with CGST/SGST/IGST totals and date filters.</li>
        <li>Profit & Loss (weighted average cost) and Stock Valuation (as of today).</li>
        <li>GSTR‑1 and GSTR‑3B summary cards for quick compliance readiness.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>9) Receivables (AR)</h5>
      <ul>
        <li>List invoices with outstanding dues; filter by search/date.</li>
        <li>Use "Record Payment" to log partial or full receipt; CSV export available from Invoices list.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>10) Payables (AP)</h5>
      <ul>
        <li>List purchases with outstanding dues; filter by vendor/date.</li>
        <li>Use "Record Payment" to log partial or full payments to vendors.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>11) Balance Sheet</h5>
      <ul>
        <li>See Inventory value (weighted average cost), Accounts Receivable, Accounts Payable, and balancing Equity.</li>
        <li>Useful for a quick health snapshot; not a substitute for full accounting ledgers.</li>
      </ul>
    </div>

    <div class="mb-4">
      <h5>12) Tips</h5>
      <ul>
        <li>Use date filters before exporting CSVs for more relevant data.</li>
        <li>Keep GSTIN and state details accurate for correct GST split and 3B ITC computation.</li>
        <li>Add HSN on products to populate GSTR‑1 HSN summary.</li>
      </ul>
    </div>
  </div>
  `
})
export class GuidePage {}
