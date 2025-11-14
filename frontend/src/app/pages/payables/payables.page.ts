import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Purchase {
  _id: string;
  date: string;
  vendorName?: string;
  total: number;
  paidAmount?: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="d-flex align-items-end gap-2 mb-2">
    <div class="me-auto"><h5 class="m-0">Accounts Payable</h5></div>
  </div>
  <form class="row g-2 mb-3" (ngSubmit)="apply()">
    <div class="col-md-4">
      <input type="text" class="form-control" [(ngModel)]="q" name="q" placeholder="Search vendor or product" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="from" name="from" />
    </div>
    <div class="col-md-3">
      <input type="date" class="form-control" [(ngModel)]="to" name="to" />
    </div>
    <div class="col-auto align-self-center">
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="pbl-showAll" [(ngModel)]="showAll" name="showAll">
        <label class="form-check-label" for="pbl-showAll">Show fully paid</label>
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
          <th style="width:22%">Date</th>
          <th>Vendor</th>
          <th class="text-end" style="width:12%">Paid (₹)</th>
          <th class="text-end" style="width:12%">Due (₹)</th>
          <th class="text-end" style="width:15%">Total (₹)</th>
          <th class="text-end" style="width:21%">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of filtered">
          <td>{{ p.date | date:'mediumDate' }}</td>
          <td>{{ p.vendorName || '-' }}</td>
          <td class="text-end">{{ (p.paidAmount || 0) | number:'1.2-2' }}</td>
          <td class="text-end">{{ (p.total - (p.paidAmount || 0)) | number:'1.2-2' }}</td>
          <td class="text-end">{{ p.total | number:'1.2-2' }}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" (click)="pay(p)">Record Payment</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!loading && filtered.length === 0">
          <td colspan="6" class="text-center text-muted">No payables found.</td>
        </tr>
      </tbody>
      <tfoot *ngIf="filtered.length">
        <tr class="table-light">
          <th colspan="2" class="text-end">Totals</th>
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
export class PayablesPage {
  private api = inject(ApiService);
  loading = false;
  q = '';
  from = '';
  to = '';
  errorMsg = '';
  purchases: Purchase[] = [];
  showAll = false;

  get filtered(): Purchase[] {
    return this.purchases.filter(p => {
      const due = p.total - (p.paidAmount || 0);
      if (!this.showAll && due <= 0.0001) return false; // hide fully paid unless showAll
      if (this.q) {
        const ql = this.q.toLowerCase();
        if (!(p.vendorName?.toLowerCase().includes(ql))) return false;
      }
      if (this.from && new Date(p.date) < new Date(this.from)) return false;
      if (this.to && new Date(p.date) > new Date(this.to + 'T23:59:59')) return false;
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
    this.api.get<Purchase[]>('/purchases', params).subscribe({
      next: (data) => { console.log('[PayablesPage] purchases response', data); this.purchases = data || []; this.loading = false; },
      error: (err) => { console.error('[PayablesPage] load error', err); this.purchases = []; this.loading = false; this.errorMsg = 'Failed to load purchases.'; }
    });
  }

  pay(p: Purchase) {
    const due = Math.max(0, p.total - (p.paidAmount || 0));
    const input = prompt(`Enter amount to record (Due: ₹${due.toFixed(2)})`, due.toFixed(2));
    if (!input) return;
    const amt = Number(input);
    if (!isFinite(amt) || amt <= 0) return;
    const newPaid = Math.min((p.paidAmount || 0) + amt, p.total);
    this.api.put(`/purchases/${p._id}/payment`, { paidAmount: newPaid }).subscribe({
      next: () => this.reload()
    });
  }

  exportCsv() {
    const headers = ['Date','Vendor','Paid','Due','Total'];
    const rows = this.filtered.map(p => {
      const paid = p.paidAmount || 0;
      const due = Math.max(0, p.total - paid);
      const d = new Date(p.date);
      const ds = isNaN(d.getTime()) ? '' : d.toISOString().substring(0,10);
      return [ds, p.vendorName || '-', paid, due, p.total];
    });
    const csv = [headers, ...rows].map(r => r.map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payables.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
}
