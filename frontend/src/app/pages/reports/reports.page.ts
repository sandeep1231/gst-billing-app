import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface StockRow {
  productId: string;
  name: string;
  unit?: string;
  openingQty: number;
  purchasedQty: number;
  soldQty: number;
  onHand: number;
  price: number;
  revenue: number;
}

interface SalesAgg { count: number; subTotal: number; total: number; cgst: number; sgst: number; igst: number; due?: number; }
interface PL { revenue: number; cogs: number; grossProfit: number; }
interface Gstr1Summary {
  period: { from: string|null; to: string|null };
  totals: { taxableValue: number; igst: number; cgst: number; sgst: number; total: number };
  byPartyType: { b2b: any; b2c: any };
  bySupplyType: { intra: any; inter: any };
  byRate: Array<{ rate: number; taxableValue: number; igst: number; cgst: number; sgst: number; total: number }>;
}
interface Gstr3bSummary {
  period: { from: string|null; to: string|null };
  outward: { taxableValue: number; cgst: number; sgst: number; igst: number; totalTax: number; grossValue: number };
  inward: { taxableValue: number; totalTax: number };
  netTaxPayable: number;
  note?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="d-flex align-items-center mb-3">
    <h4 class="m-0">Reports</h4>
  </div>

  <div class="card mb-3">
    <div class="card-header">Sales Summary</div>
    <div class="card-body">
      <form class="row g-2 mb-2" (ngSubmit)="loadSales()">
        <div class="col-md-4"><input type="date" class="form-control" [(ngModel)]="from" name="from" /></div>
        <div class="col-md-4"><input type="date" class="form-control" [(ngModel)]="to" name="to" /></div>
        <div class="col-md-4 d-grid"><button class="btn btn-outline-secondary" type="submit">Apply</button></div>
      </form>
      <div *ngIf="sales" class="table-responsive">
        <table class="table table-sm">
          <tbody>
            <tr><th>Invoices</th><td>{{ sales.count }}</td></tr>
            <tr><th>Sub Total (₹)</th><td>{{ sales.subTotal | number:'1.2-2' }}</td></tr>
            <tr><th>CGST (₹)</th><td>{{ sales.cgst | number:'1.2-2' }}</td></tr>
            <tr><th>SGST (₹)</th><td>{{ sales.sgst | number:'1.2-2' }}</td></tr>
            <tr><th>IGST (₹)</th><td>{{ sales.igst | number:'1.2-2' }}</td></tr>
            <tr class="table-active"><th>Total (₹)</th><td><strong>{{ sales.total | number:'1.2-2' }}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-3">
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-header">Profit & Loss (Weighted Avg Cost)</div>
        <div class="card-body" *ngIf="pl">
          <table class="table table-sm mb-0">
            <tbody>
              <tr><th>Revenue (₹)</th><td class="text-end">{{ pl.revenue | number:'1.2-2' }}</td></tr>
              <tr><th>COGS (₹)</th><td class="text-end">{{ pl.cogs | number:'1.2-2' }}</td></tr>
              <tr class="table-active"><th>Gross Profit (₹)</th><td class="text-end"><strong>{{ pl.grossProfit | number:'1.2-2' }}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-header">Stock Valuation (as of today)</div>
        <div class="card-body" *ngIf="valuation !== null">
          <div class="display-6">₹{{ valuation | number:'1.2-2' }}</div>
          <div class="text-muted">Weighted average purchase cost</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header d-flex align-items-center">
      <div class="me-auto">Stock Snapshot</div>
      <button class="btn btn-sm btn-outline-secondary" (click)="exportStockCsv()" [disabled]="!stock || stock.length===0">Export CSV</button>
    </div>
    <div class="card-body">
      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-end">Opening</th>
              <th class="text-end">Purchased</th>
              <th class="text-end">Sold</th>
              <th class="text-end">On Hand</th>
              <th class="text-end">Price (₹)</th>
              <th class="text-end">Revenue (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of stock">
              <td>{{ r.name }}</td>
              <td class="text-end">{{ r.openingQty }}</td>
              <td class="text-end">{{ r.purchasedQty }}</td>
              <td class="text-end">{{ r.soldQty }}</td>
              <td class="text-end">{{ r.onHand }}</td>
              <td class="text-end">{{ r.price | number:'1.2-2' }}</td>
              <td class="text-end">{{ r.revenue | number:'1.2-2' }}</td>
            </tr>
            <tr *ngIf="stock && stock.length===0"><td colspan="7" class="text-center text-muted">No stock data.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="row g-3 mt-3">
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-header">GSTR-1 (Summary)</div>
        <div class="card-body" *ngIf="gstr1">
          <table class="table table-sm mb-3">
            <tbody>
              <tr><th>Taxable Value (₹)</th><td class="text-end">{{ gstr1.totals.taxableValue | number:'1.2-2' }}</td></tr>
              <tr><th>CGST (₹)</th><td class="text-end">{{ gstr1.totals.cgst | number:'1.2-2' }}</td></tr>
              <tr><th>SGST (₹)</th><td class="text-end">{{ gstr1.totals.sgst | number:'1.2-2' }}</td></tr>
              <tr><th>IGST (₹)</th><td class="text-end">{{ gstr1.totals.igst | number:'1.2-2' }}</td></tr>
              <tr class="table-active"><th>Total (₹)</th><td class="text-end"><strong>{{ gstr1.totals.total | number:'1.2-2' }}</strong></td></tr>
            </tbody>
          </table>
          <div class="small text-muted">Includes by-rate and HSN summaries in API; UI shows totals for now.</div>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-header">GSTR-3B (Summary)</div>
        <div class="card-body" *ngIf="gstr3b">
          <table class="table table-sm mb-3">
            <tbody>
              <tr><th>Outward Taxable (₹)</th><td class="text-end">{{ gstr3b.outward.taxableValue | number:'1.2-2' }}</td></tr>
              <tr><th>Outward Tax (₹)</th><td class="text-end">{{ gstr3b.outward.totalTax | number:'1.2-2' }}</td></tr>
              <tr><th>Inward ITC (₹)</th><td class="text-end">{{ gstr3b.inward.totalTax | number:'1.2-2' }}</td></tr>
              <tr class="table-active"><th>Net Tax Payable (₹)</th><td class="text-end"><strong>{{ gstr3b.netTaxPayable | number:'1.2-2' }}</strong></td></tr>
            </tbody>
          </table>
          <div class="small text-muted" *ngIf="gstr3b.note">{{ gstr3b.note }}</div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class ReportsPage {
  private api = inject(ApiService);

  stock: StockRow[] = [];
  sales?: SalesAgg;
  pl?: PL;
  valuation: number | null = null;
  gstr1?: Gstr1Summary;
  gstr3b?: Gstr3bSummary;
  from = '';
  to = '';

  ngOnInit() {
    this.loadStock();
    this.loadSales();
    this.loadPL();
    this.loadValuation();
    this.loadGstrs();
  }

  loadStock() {
    this.api.get<StockRow[]>('/reports/stock').subscribe({ next: d => this.stock = d, error: () => this.stock = [] });
  }
  loadSales() {
    const p: any = {};
    if (this.from) p.from = this.from;
    if (this.to) p.to = this.to;
    this.api.get<SalesAgg>('/reports/sales', p).subscribe({ next: d => this.sales = d, error: () => this.sales = undefined });
    this.loadPL();
  }

  loadPL() {
    const p: any = {};
    if (this.from) p.from = this.from;
    if (this.to) p.to = this.to;
    this.api.get<PL>('/reports/pl', p).subscribe({ next: d => this.pl = d, error: () => this.pl = undefined });
  }
  loadValuation() {
    const today = new Date().toISOString().substring(0,10);
    this.api.get<any>('/reports/valuation', { date: today }).subscribe({ next: v => this.valuation = v?.stockValue ?? null, error: () => this.valuation = null });
  }

  loadGstrs() {
    const p: any = {};
    if (this.from) p.from = this.from;
    if (this.to) p.to = this.to;
    this.api.get<Gstr1Summary>('/reports/gstr1', p).subscribe({ next: d => this.gstr1 = d, error: () => this.gstr1 = undefined });
    this.api.get<Gstr3bSummary>('/reports/gstr3b', p).subscribe({ next: d => this.gstr3b = d, error: () => this.gstr3b = undefined });
  }

  exportStockCsv() {
    const headers = ['Product','Opening','Purchased','Sold','On Hand','Price','Revenue'];
    const rows = this.stock.map(r => [r.name, r.openingQty, r.purchasedQty, r.soldQty, r.onHand, r.price, r.revenue]);
    const csv = [headers, ...rows].map(arr => arr.map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stock.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
}
