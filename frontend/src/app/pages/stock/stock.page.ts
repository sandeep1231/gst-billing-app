import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../services/products.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <h4 class="mb-3">Stock</h4>
  <div class="table-responsive">
    <table class="table table-sm align-middle">
      <thead>
        <tr>
          <th>Product</th>
          <th>Unit</th>
          <th class="text-end">Opening Qty</th>
          <th class="text-end">Purchased Qty</th>
          <th class="text-end">Sold Qty</th>
          <th class="text-end">On Hand</th>
          <th class="text-end">Price (₹)</th>
          <th class="text-end">Revenue (₹)</th>
          <th class="text-end">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of rows">
          <td>{{ r.name }}</td>
          <td>{{ r.unit || '-' }}</td>
          <td class="text-end">
            <ng-container *ngIf="editId !== r.productId; else editTpl">{{ r.openingQty || 0 }}</ng-container>
            <ng-template #editTpl>
              <input type="number" class="form-control form-control-sm text-end" [(ngModel)]="editQty" />
            </ng-template>
          </td>
          <td class="text-end">{{ r.purchasedQty | number:'1.0-2' }}</td>
          <td class="text-end">{{ r.soldQty | number:'1.0-2' }}</td>
          <td class="text-end" [class.text-danger]="(r.onHand || 0) < 0">{{ r.onHand | number:'1.0-2' }}</td>
          <td class="text-end">{{ r.price | number:'1.2-2' }}</td>
          <td class="text-end">{{ r.revenue | number:'1.2-2' }}</td>
          <td class="text-end">
            <button *ngIf="editId !== r.productId" class="btn btn-sm btn-outline-primary" (click)="startEdit(r)">Edit</button>
            <div class="btn-group btn-group-sm" *ngIf="editId === r.productId">
              <button class="btn btn-success" (click)="save(r)">Save</button>
              <button class="btn btn-outline-secondary" (click)="cancel()">Cancel</button>
            </div>
          </td>
        </tr>
        <tr *ngIf="!loading && rows.length === 0">
          <td colspan="9" class="text-center text-muted">No products</td>
        </tr>
      </tbody>
    </table>
  </div>
  `
})
export class StockPage {
  constructor(private api: ApiService, private products: ProductsService) {}
  rows: any[] = [];
  loading = false;
  editId: string | null = null;
  editQty = 0;

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.api.get<any[]>('/reports/stock').subscribe({
      next: (data) => { this.rows = data; this.loading = false; },
      error: () => { this.rows = []; this.loading = false; }
    });
  }

  startEdit(r: any) { this.editId = r.productId; this.editQty = r.openingQty || 0; }
  cancel() { this.editId = null; }
  save(r: any) {
    if (!this.editId) return;
    this.products.update(this.editId, { openingQty: Number(this.editQty) }).subscribe({
      next: (p) => { this.editId = null; this.reload(); },
      error: () => { this.editId = null; this.reload(); }
    });
  }
}
