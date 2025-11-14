import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface InvoiceItem { name: string; qty: number; price: number; gstPercent: number; }
interface Invoice {
  _id: string;
  invoiceNo: string;
  date: string;
  total: number;
  subTotal: number;
  tax?: { cgst: number; sgst: number; igst: number };
  customerSnapshot?: { name?: string };
  paidAmount?: number;
  status?: string;
}

@Component({
  standalone: true,
  selector: 'app-invoice-list',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="d-flex align-items-end gap-2 mb-2">
    <div class="me-auto"><h5 class="m-0">Recent Invoices</h5></div>
  </div>
  <form class="row g-2 mb-2" (ngSubmit)="apply()">
    <div class="col-md-4">
      <input type="text" class="form-control" [(ngModel)]="q" name="q" placeholder="Search invoice no or customer" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="from" name="from" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="to" name="to" />
    </div>
    <div class="col-md-2 d-grid">
      <div class="btn-group">
        <button class="btn btn-outline-secondary" type="submit">Apply</button>
        <button class="btn btn-outline-primary" type="button" (click)="exportCsv()" [disabled]="loading || invoices.length===0">CSV</button>
        <button class="btn btn-outline-success" type="button" (click)="exportAll()" [disabled]="loading">Export All</button>
      </div>
    </div>
  </form>
  <div class="table-responsive">
    <table class="table table-sm align-middle">
      <thead>
        <tr>
          <th style="width:22%">Invoice No</th>
          <th style="width:18%">Date</th>
          <th>Customer</th>
          <th class="text-end" style="width:12%">Due (₹)</th>
          <th class="text-end" style="width:15%">Total (₹)</th>
          <th class="text-end" style="width:15%">Tax (₹)</th>
          <th style="width:15%" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let inv of invoices">
          <td>{{ inv.invoiceNo }}</td>
          <td>{{ inv.date | date:'mediumDate' }}</td>
          <td>{{ inv.customerSnapshot?.name || 'Walk-in' }}</td>
          <td class="text-end">{{ (inv.total - (inv.paidAmount || 0)) | number:'1.2-2' }}</td>
          <td class="text-end">{{ inv.total | number:'1.2-2' }}</td>
          <td class="text-end">{{ (inv.tax?.cgst || 0) + (inv.tax?.sgst || 0) + (inv.tax?.igst || 0) | number:'1.2-2' }}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" (click)="download(inv)">PDF</button>
              <button class="btn btn-outline-success" (click)="markPaid(inv)" [disabled]="(inv.paidAmount || 0) >= inv.total">Mark Paid</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!loading && invoices.length === 0">
          <td colspan="7" class="text-center text-muted">No invoices yet.</td>
        </tr>
      </tbody>
      <tfoot *ngIf="summary">
        <tr class="table-light">
          <th colspan="3" class="text-end">Summary (filtered)</th>
          <th class="text-end">₹{{ summary.due | number:'1.2-2' }}</th>
          <th class="text-end">₹{{ summary.total | number:'1.2-2' }}</th>
          <th class="text-end">₹{{ (summary.cgst + summary.sgst + summary.igst) | number:'1.2-2' }}</th>
          <th></th>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="d-flex align-items-center gap-2 mt-2">
    <div class="me-auto text-muted">Page {{ page }}</div>
    <div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" (click)="prev()" [disabled]="loading || page <= 1">Prev</button>
      <button class="btn btn-sm btn-outline-secondary" (click)="next()" [disabled]="loading || lastCount < limit">Next</button>
    </div>
  </div>
  `
})
export class InvoiceListComponent {
  private api = inject(ApiService);
  invoices: Invoice[] = [];
  loading = false;
  q = '';
  from = '';
  to = '';
  page = 1;
  readonly limit = 20;
  lastCount = 0;
  summary: { count: number; subTotal: number; total: number; cgst: number; sgst: number; igst: number; due: number } | null = null;

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit };
    if (this.q) params.q = this.q;
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;
    this.api.get<Invoice[]>('/invoices', params).subscribe({
      next: (data) => { this.invoices = data; this.lastCount = data.length; this.loading = false; },
      error: () => { this.invoices = []; this.loading = false; }
    });
    // Load summary
    const sParams: any = {};
    if (this.q) sParams.q = this.q;
    if (this.from) sParams.from = this.from;
    if (this.to) sParams.to = this.to;
    this.api.get<typeof this.summary>('/reports/sales', sParams).subscribe({
      next: (s) => this.summary = s as any,
      error: () => this.summary = null
    });
  }
  apply() { this.page = 1; this.reload(); }
  prev() { if (this.page > 1 && !this.loading) { this.page--; this.reload(); } }
  next() { if (!this.loading && this.lastCount >= this.limit) { this.page++; this.reload(); } }

  exportCsv() {
    const headers = ['Invoice No','Date','Customer','Sub Total','Tax','Total'];
    const rows = this.invoices.map(inv => {
      const tax = (inv.tax?.cgst || 0) + (inv.tax?.sgst || 0) + (inv.tax?.igst || 0);
      const d = new Date(inv.date);
      const ds = isNaN(d.getTime()) ? '' : d.toISOString().substring(0,10);
      return [inv.invoiceNo, ds, inv.customerSnapshot?.name || 'Walk-in', inv.subTotal, tax, inv.total];
    });
    const csv = [headers, ...rows].map(r => r.map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  exportAll() {
    const params: any = {};
    if (this.q) params.q = this.q;
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;
    this.api.getBlob('/invoices/export', params).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoices_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    });
  }

  download(inv: Invoice) {
    this.api.getBlob(`/invoices/${inv._id}/pdf`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNo || 'Invoice'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    });
  }
  markPaid(inv: Invoice) {
    if (!inv?._id) return;
    this.api.put(`/invoices/${inv._id}/payment`, { paidAmount: inv.total }).subscribe({
      next: () => this.reload()
    });
  }
}
