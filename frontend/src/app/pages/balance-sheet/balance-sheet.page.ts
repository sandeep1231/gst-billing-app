import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface BalanceSheetSnapshot {
  asOf: string;
  assets: { inventory: number; accountsReceivable: number; total: number };
  liabilities: { accountsPayable: number; total: number };
  equity: number; // backend returns plain number
}

interface BalanceSheetRangeResponse {
  from: BalanceSheetSnapshot;
  to: BalanceSheetSnapshot;
  delta: { assets: number; liabilities: number; equity: number };
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="row g-3">
    <div class="col-12">
      <h5 class="m-0">Balance Sheet</h5>
      <div class="text-muted" *ngIf="data">As of {{ data.asOf | date:'medium' }}</div>
      <div class="text-muted" *ngIf="range">Comparing {{ range.from.asOf | date:'mediumDate' }} → {{ range.to.asOf | date:'mediumDate' }}</div>
      <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
        <form (ngSubmit)="reload()" #singleForm="ngForm" class="d-flex gap-2 align-items-center">
          <input type="date" class="form-control form-control-sm" [(ngModel)]="date" name="date" />
          <button type="submit" class="btn btn-sm btn-outline-primary">Load</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="clearDate()" [disabled]="!date">Clear</button>
        </form>
        <form (ngSubmit)="reload()" #rangeForm="ngForm" class="d-flex gap-2 align-items-center">
          <input type="date" class="form-control form-control-sm" [(ngModel)]="fromDate" name="fromDate" placeholder="From" />
          <span class="small">→</span>
          <input type="date" class="form-control form-control-sm" [(ngModel)]="toDate" name="toDate" placeholder="To" />
          <button type="submit" class="btn btn-sm btn-outline-primary" [disabled]="!fromDate || !toDate">Compare</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="clearRange()" [disabled]="!fromDate && !toDate">Clear Range</button>
        </form>
        <button type="button" class="btn btn-sm btn-outline-success" (click)="exportCsv()" [disabled]="!data && !range">Export CSV</button>
      </div>
    </div>
    <div class="col-md-4" *ngIf="data">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title">Assets</h6>
          <div class="d-flex justify-content-between"><span>Inventory</span><span>₹{{ data?.assets.inventory | number:'1.2-2' }}</span></div>
          <div class="d-flex justify-content-between"><span>Accounts Receivable</span><span>₹{{ data?.assets.accountsReceivable | number:'1.2-2' }}</span></div>
          <hr>
          <div class="d-flex justify-content-between fw-semibold"><span>Total Assets</span><span>₹{{ data?.assets.total | number:'1.2-2' }}</span></div>
        </div>
      </div>
    </div>
    <div class="col-md-4" *ngIf="data">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title">Liabilities</h6>
          <div class="d-flex justify-content-between"><span>Accounts Payable</span><span>₹{{ data?.liabilities.accountsPayable | number:'1.2-2' }}</span></div>
          <hr>
          <div class="d-flex justify-content-between fw-semibold"><span>Total Liabilities</span><span>₹{{ data?.liabilities.total | number:'1.2-2' }}</span></div>
        </div>
      </div>
    </div>
    <div class="col-md-4" *ngIf="data">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title">Equity</h6>
          <div class="d-flex justify-content-between"><span>Owner's Equity</span><span>₹{{ data?.equity | number:'1.2-2' }}</span></div>
          <div class="mt-3 text-muted small">Computed as Assets - Liabilities</div>
        </div>
      </div>
    </div>

    <ng-container *ngIf="range">
      <div class="col-12">
        <div class="card">
          <div class="card-body table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th class="text-end">From</th>
                  <th class="text-end">To</th>
                  <th class="text-end">Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Inventory</td>
                  <td class="text-end">₹{{ range.from.assets.inventory | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ range.to.assets.inventory | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ (range.to.assets.inventory - range.from.assets.inventory) | number:'1.2-2' }}</td>
                </tr>
                <tr>
                  <td>Accounts Receivable</td>
                  <td class="text-end">₹{{ range.from.assets.accountsReceivable | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ range.to.assets.accountsReceivable | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ (range.to.assets.accountsReceivable - range.from.assets.accountsReceivable) | number:'1.2-2' }}</td>
                </tr>
                <tr>
                  <td>Accounts Payable</td>
                  <td class="text-end">₹{{ range.from.liabilities.accountsPayable | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ range.to.liabilities.accountsPayable | number:'1.2-2' }}</td>
                  <td class="text-end">₹{{ (range.to.liabilities.accountsPayable - range.from.liabilities.accountsPayable) | number:'1.2-2' }}</td>
                </tr>
                <tr class="table-light">
                  <td class="fw-semibold">Total Assets</td>
                  <td class="text-end fw-semibold">₹{{ range.from.assets.total | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.to.assets.total | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.delta.assets | number:'1.2-2' }}</td>
                </tr>
                <tr class="table-light">
                  <td class="fw-semibold">Total Liabilities</td>
                  <td class="text-end fw-semibold">₹{{ range.from.liabilities.total | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.to.liabilities.total | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.delta.liabilities | number:'1.2-2' }}</td>
                </tr>
                <tr class="table-light">
                  <td class="fw-semibold">Owner Equity</td>
                  <td class="text-end fw-semibold">₹{{ range.from.equity | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.to.equity | number:'1.2-2' }}</td>
                  <td class="text-end fw-semibold">₹{{ range.delta.equity | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-container>
  </div>
  `
})
export class BalanceSheetPage {
  private api = inject(ApiService);
  data: BalanceSheetSnapshot | null = null;
  range: BalanceSheetRangeResponse | null = null;
  date: string | null = null; // single snapshot date
  fromDate: string | null = null;
  toDate: string | null = null;

  ngOnInit() {
    this.reload();
  }
  reload() {
    this.range = null;
    if (this.fromDate && this.toDate) {
      const params: any = { from: this.fromDate, to: this.toDate };
      this.api.get<BalanceSheetRangeResponse>('/reports/balance-sheet-range', params).subscribe({
        next: d => { this.range = d; this.data = null; },
        error: () => { this.range = null; }
      });
      return;
    }
    const params: any = {};
    if (this.date) params.date = this.date;
    this.api.get<BalanceSheetSnapshot>('/reports/balance-sheet', params).subscribe({
      next: (d) => { this.data = d; },
      error: () => { this.data = null; }
    });
  }
  clearDate() { this.date = null; this.reload(); }
  clearRange() { this.fromDate = null; this.toDate = null; this.reload(); }
  exportCsv() {
    let rows: string[][] = [];
    if (this.range) {
      const f = this.range.from; const t = this.range.to; const dl = this.range.delta;
      rows = [
        ['Metric','From','To','Delta'],
        ['As Of', new Date(f.asOf).toISOString(), new Date(t.asOf).toISOString(), ''],
        ['Inventory', f.assets.inventory.toFixed(2), t.assets.inventory.toFixed(2), (t.assets.inventory - f.assets.inventory).toFixed(2)],
        ['Accounts Receivable', f.assets.accountsReceivable.toFixed(2), t.assets.accountsReceivable.toFixed(2), (t.assets.accountsReceivable - f.assets.accountsReceivable).toFixed(2)],
        ['Accounts Payable', f.liabilities.accountsPayable.toFixed(2), t.liabilities.accountsPayable.toFixed(2), (t.liabilities.accountsPayable - f.liabilities.accountsPayable).toFixed(2)],
        ['Total Assets', f.assets.total.toFixed(2), t.assets.total.toFixed(2), dl.assets.toFixed(2)],
        ['Total Liabilities', f.liabilities.total.toFixed(2), t.liabilities.total.toFixed(2), dl.liabilities.toFixed(2)],
        ['Owner Equity', f.equity.toFixed(2), t.equity.toFixed(2), dl.equity.toFixed(2)]
      ];
    } else if (this.data) {
      const d = this.data;
      rows = [
        ['Metric','Value'],
        ['As Of', new Date(d.asOf).toISOString()],
        ['Inventory', d.assets.inventory.toFixed(2)],
        ['Accounts Receivable', d.assets.accountsReceivable.toFixed(2)],
        ['Accounts Payable', d.liabilities.accountsPayable.toFixed(2)],
        ['Total Assets', d.assets.total.toFixed(2)],
        ['Total Liabilities', d.liabilities.total.toFixed(2)],
        ['Owner Equity', d.equity.toFixed(2)]
      ];
    } else { return; }
    const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.range ? `balance-sheet-range-${this.fromDate || 'start'}-${this.toDate || 'end'}.csv` : `balance-sheet-${(this.date||'today')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
