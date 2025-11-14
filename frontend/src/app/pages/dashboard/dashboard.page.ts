import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <h4>Dashboard</h4>
  <div class="row g-3 mb-3">
    <div class="col-md-3">
      <div class="card text-bg-light">
        <div class="card-body">
          <div class="text-muted">Today Sales</div>
          <div class="h5 mb-0">₹{{ today.total | number:'1.2-2' }}</div>
          <small class="text-muted">Invoices: {{ today.count }}</small>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-bg-light">
        <div class="card-body">
          <div class="text-muted">MTD Sales</div>
          <div class="h5 mb-0">₹{{ mtd.total | number:'1.2-2' }}</div>
          <small class="text-muted">Invoices: {{ mtd.count }}</small>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-bg-light">
        <div class="card-body">
          <div class="text-muted">Customers</div>
          <div class="h5 mb-0">{{ counts.customers }}</div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-bg-light">
        <div class="card-body">
          <div class="text-muted">Products</div>
          <div class="h5 mb-0">{{ counts.products }}</div>
          <small class="text-muted">Low stock: {{ lowStock }}</small>
        </div>
      </div>
    </div>
  </div>
  `
})
export class DashboardPage {
  private api = inject(ApiService);

  today: any = { count: 0, total: 0 };
  mtd: any = { count: 0, total: 0 };
  counts: any = { products: 0, customers: 0, invoices: 0 };
  lowStock = 0;

  ngOnInit() {
    // Derive IST current date regardless of user local timezone
    const IST_OFFSET_MINUTES = 330;
    const nowUtc = new Date();
    const istNow = new Date(nowUtc.getTime() + IST_OFFSET_MINUTES * 60_000);
    const yyyyMmDd = (y: number, m: number, d: number) => `${y.toString().padStart(4,'0')}-${(m+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    const todayStr = yyyyMmDd(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    const monthStartStr = yyyyMmDd(istNow.getFullYear(), istNow.getMonth(), 1);

    // Today (IST)
    this.api.get<any>('/reports/sales', { from: todayStr, to: todayStr })
      .subscribe({ next: d => this.today = d });
    // Month to date (IST) - from first of month to today
    this.api.get<any>('/reports/sales', { from: monthStartStr, to: todayStr })
      .subscribe({ next: d => this.mtd = d });
    // Counts
    this.api.get<any>('/reports/counts').subscribe({ next: d => this.counts = d });
    // Low stock
    this.api.get<any[]>('/reports/stock').subscribe({ next: rows => {
      this.lowStock = rows.filter(r => (r.onHand ?? 0) <= 5).length;
    }});
  }
}
