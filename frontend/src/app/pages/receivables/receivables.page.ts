import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Invoice {
  _id: string;
  invoiceNo: string;
  date: string;
  total: number;
  subTotal?: number;
  paidAmount?: number;
  customerSnapshot?: { name?: string };
  tax?: { cgst: number; sgst: number; igst: number };
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="d-flex align-items-end gap-2 mb-2">
    <div class="me-auto"><h5 class="m-0">Accounts Receivable</h5></div>
  </div>
  <form class="row g-2 mb-3" (ngSubmit)="apply()">
    <div class="col-md-4">
      <input type="text" class="form-control" [(ngModel)]="q" name="q" placeholder="Search invoice no or customer" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="from" name="from" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="to" name="to" />
    </div>
    <div class="col-auto align-self-center">
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="rcv-showAll" [(ngModel)]="showAll" name="showAll">
        <label class="form-check-label" for="rcv-showAll">Show fully paid</label>
      </div>
    </div>
    <div class="col-md-2 d-grid">
      <div class="btn-group">
        <button class="btn btn-outline-secondary" type="submit">Apply</button>
        <button class="btn btn-outline-primary" type="button" (click)="exportCsv()" [disabled]="loading || filtered.length===0">CSV</button>
      </div>
    </div>
  </form>
  <div *ngIf="errorMsg" class="alert alert-danger" role="alert">{{ errorMsg }}</div>
  <div class="table-responsive">
    <table class="table table-sm align-middle">
      <thead>
        <tr>
          <th style="width:22%">Invoice No</th>
          <th style="width:18%">Date</th>
          <th>Customer</th>
          <th class="text-end" style="width:12%">Paid (₹)</th>
          <th class="text-end" style="width:12%">Due (₹)</th>
          <th class="text-end" style="width:15%">Total (₹)</th>
          <th class="text-end" style="width:21%">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let inv of filtered">
          <td>{{ inv.invoiceNo }}</td>
          <td>{{ inv.date | date:'mediumDate' }}</td>
          <td>{{ inv.customerSnapshot?.name || 'Walk-in' }}</td>
          <td class="text-end">{{ (inv.paidAmount || 0) | number:'1.2-2' }}</td>
          <td class="text-end">{{ (inv.total - (inv.paidAmount || 0)) | number:'1.2-2' }}</td>
          <td class="text-end">{{ inv.total | number:'1.2-2' }}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" (click)="pay(inv)">Record Payment</button>
              <button class="btn btn-outline-secondary" (click)="openPdf(inv)">PDF</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!loading && filtered.length === 0">
          <td colspan="7" class="text-center text-muted">No receivables found.</td>
        </tr>
      </tbody>
      <tfoot *ngIf="filtered.length">
        <tr class="table-light">
          <th colspan="3" class="text-end">Totals</th>
          <th class="text-end">₹{{ totalPaid | number:'1.2-2' }}</th>
          <th class="text-end">₹{{ totalDue | number:'1.2-2' }}</th>
          <th class="text-end">₹{{ totalAmount | number:'1.2-2' }}</th>
          <th></th>
        </tr>
      </tfoot>
    </table>
  </div>
  `
})
export class ReceivablesPage {
  private api = inject(ApiService);
  loading = false;
  q = '';
  from = '';
  to = '';
  errorMsg = '';
  invoices: Invoice[] = [];
  showAll = false;

  get filtered(): Invoice[] {
    return this.invoices.filter(inv => {
      const due = inv.total - (inv.paidAmount || 0);
      if (!this.showAll && due <= 0.0001) return false; // hide fully paid unless showAll
      if (this.q) {
        const ql = this.q.toLowerCase();
        const name = inv.customerSnapshot?.name?.toLowerCase() || '';
        if (!(inv.invoiceNo?.toLowerCase().includes(ql) || name.includes(ql))) return false;
      }
      if (this.from && new Date(inv.date) < new Date(this.from)) return false;
      if (this.to && new Date(inv.date) > new Date(this.to + 'T23:59:59')) return false;
      return true;
    });
  }

  get totalPaid() { return this.filtered.reduce((s, x) => s + (x.paidAmount || 0), 0); }
  get totalDue() { return this.filtered.reduce((s, x) => s + (x.total - (x.paidAmount || 0)), 0); }
  get totalAmount() { return this.filtered.reduce((s, x) => s + x.total, 0); }

  ngOnInit() { this.reload(); }

  apply() { this.reload(); }

  reload() {
    this.loading = true;
    this.errorMsg = '';
    const params: any = { page: 1, limit: 200 };
    this.api.get<Invoice[]>('/invoices', params).subscribe({
      next: (data) => { console.log('[ReceivablesPage] invoices response', data); this.invoices = data || []; this.loading = false; },
      error: (err) => { console.error('[ReceivablesPage] load error', err); this.invoices = []; this.loading = false; this.errorMsg = 'Failed to load invoices.'; }
    });
  }

  pay(inv: Invoice) {
    const due = Math.max(0, inv.total - (inv.paidAmount || 0));
    const input = prompt(`Enter amount to record (Due: ₹${due.toFixed(2)})`, due.toFixed(2));
    if (!input) return;
    const amt = Number(input);
    if (!isFinite(amt) || amt <= 0) return;
    const newPaid = Math.min((inv.paidAmount || 0) + amt, inv.total);
    this.api.put(`/invoices/${inv._id}/payment`, { paidAmount: newPaid }).subscribe({
      next: () => this.reload()
    });
  }

  openPdf(inv: Invoice) {
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

  exportCsv() {
    const headers = ['Invoice No','Date','Customer','Paid','Due','Total'];
    const rows = this.filtered.map(inv => {
      const paid = inv.paidAmount || 0;
      const due = Math.max(0, inv.total - paid);
      const d = new Date(inv.date);
      const ds = isNaN(d.getTime()) ? '' : d.toISOString().substring(0,10);
      return [inv.invoiceNo, ds, inv.customerSnapshot?.name || 'Walk-in', paid, due, inv.total];
    });
    const csv = [headers, ...rows].map(r => r.map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'receivables.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
}
