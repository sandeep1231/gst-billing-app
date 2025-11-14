import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { ProductsService, Product } from '../../services/products.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgIf, NgFor],
  template: `
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0">Products</h4>
    <button class="btn btn-primary" (click)="startCreate()" *ngIf="!formVisible">Add Product</button>
  </div>

  <div class="card mb-3" *ngIf="formVisible">
    <div class="card-body">
      <form [formGroup]="form" (ngSubmit)="save()" class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Name</label>
          <input type="text" class="form-control" formControlName="name" required />
        </div>
        <div class="col-md-2">
          <label class="form-label">Price</label>
          <input type="number" class="form-control" formControlName="price" step="0.01" required />
        </div>
        <div class="col-md-2">
          <label class="form-label">GST %</label>
          <input type="number" class="form-control" formControlName="gstPercent" step="0.1" required />
        </div>
        <div class="col-md-2">
          <label class="form-label">Opening Qty</label>
          <input type="number" class="form-control" formControlName="openingQty" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Unit</label>
          <input type="text" class="form-control" formControlName="unit" />
        </div>
        <div class="col-md-2">
          <label class="form-label">HSN</label>
          <input type="text" class="form-control" formControlName="hsn" />
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" [disabled]="form.invalid || saving" type="submit">{{ saving ? 'Saving...' : (editId ? 'Update' : 'Create') }}</button>
          <button type="button" class="btn btn-outline-secondary" (click)="cancel()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <div *ngIf="errorMsg" class="alert alert-danger" role="alert">
    {{ errorMsg }}
  </div>

  <div class="row g-2 mb-2">
    <div class="col-auto">
      <input class="form-control" placeholder="Search products..." [(ngModel)]="query" (ngModelChange)="load()" />
    </div>
  </div>

  <div class="card">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>GST %</th>
            <th>Unit</th>
            <th class="text-end">Opening Qty</th>
            <th>HSN</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="loading">
            <td colspan="7" class="text-center text-muted py-4">Loading...</td>
          </tr>
          <tr *ngFor="let p of items">
            <td>{{ p.name }}</td>
            <td>₹{{ p.price | number:'1.2-2' }}</td>
            <td>{{ p.gstPercent }}</td>
            <td>{{ p.unit }}</td>
            <td class="text-end">{{ p.openingQty || 0 }}</td>
            <td>{{ p.hsn }}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-2" (click)="startEdit(p)">Edit</button>
              <button class="btn btn-sm btn-outline-danger" (click)="remove(p)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="!loading && items.length === 0 && !errorMsg">
            <td colspan="7" class="text-center text-muted py-4">No products</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
})
export class ProductsPage {
  constructor(private fb: FormBuilder, private api: ProductsService) {}

  items: Product[] = [];
  loading = false;
  saving = false;
  formVisible = false;
  editId: string | null = null;
  query = '';
  errorMsg = '';

  form = this.fb.group({
    name: ['', Validators.required],
    price: [0, Validators.required],
    gstPercent: [0, Validators.required],
    openingQty: [0],
    unit: [''],
    hsn: ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.search(this.query).subscribe({
      next: (res) => {
        console.log('[ProductsPage] API response', res);
        if (Array.isArray(res)) {
          this.items = res;
        } else if (res && (res as any).data && Array.isArray((res as any).data)) {
          // fallback if backend later wraps response
          this.items = (res as any).data;
        } else {
          console.warn('[ProductsPage] Unexpected products response shape', res);
          this.items = [];
        }
        console.log('[ProductsPage] items length', this.items.length);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.items = [];
        this.errorMsg = (err?.error?.error === 'invalid' || err?.status === 401)
          ? 'Session expired. Please login again.'
          : 'Failed to load products. Please try again.';
        console.error('[ProductsPage] load error', err);
      }
    });
  }

  startCreate() {
    this.form.reset({ name: '', price: 0, gstPercent: 0, openingQty: 0, unit: '', hsn: '' });
    this.editId = null;
    this.formVisible = true;
  }
  startEdit(p: Product) {
    this.form.setValue({ name: p.name, price: p.price, gstPercent: p.gstPercent, openingQty: p.openingQty || 0, unit: p.unit || '', hsn: p.hsn || '' });
    this.editId = p._id || null;
    this.formVisible = true;
  }
  cancel() { this.formVisible = false; this.editId = null; }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const value = this.form.value as any;
    const req = this.editId
      ? this.api.update(this.editId, value)
      : this.api.create(value);
    req.subscribe({
      next: (p) => { console.log('[ProductsPage] saved product', p); this.saving = false; this.formVisible = false; this.load(); },
      error: (err) => {
        this.saving = false;
        this.errorMsg = 'Failed to save product. Please try again.';
        console.error('[ProductsPage] save error', err);
      }
    });
  }

  remove(p: Product) {
    if (!p._id) return;
    if (!confirm(`Delete product '${p.name}'?`)) return;
  this.api.remove(p._id).subscribe({ next: () => this.load() });
  }
}
