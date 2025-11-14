import { Component } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { ProductsService, Product } from '../../services/products.service';
import { PurchasesService } from '../../services/purchases.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor, NgbTypeaheadModule],
  template: `
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0">Purchases</h4>
    <button class="btn btn-primary" (click)="formVisible = true" *ngIf="!formVisible">Add Purchase</button>
  </div>

  <div class="card mb-3" *ngIf="formVisible">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h5 class="mb-0">New Purchase</h5>
        <button class="btn btn-sm btn-outline-secondary" (click)="cancel()">Cancel</button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()" class="row g-2">
        <div class="col-12">
          <label class="form-label">Vendor</label>
          <input type="text" class="form-control" formControlName="vendorName" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Vendor GSTIN</label>
          <input type="text" class="form-control" formControlName="vendorGstin" (blur)="upper('vendorGstin')" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Vendor State</label>
          <select class="form-select" formControlName="vendorStateCode">
            <option value="">Select state</option>
            <option *ngFor="let s of states" [value]="s.code">{{ s.name }} ({{ s.code }})</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label">Items</label>
          <!-- Desktop/tablet view -->
          <div class="table-responsive d-none d-md-block">
            <table class="table table-sm align-middle mb-2">
              <thead>
                <tr>
                  <th style="width:38%">Product</th>
                  <th style="width:16%">Qty</th>
                  <th style="width:23%">Price</th>
                  <th style="width:23%">GST %</th>
                </tr>
              </thead>
              <tbody formArrayName="items">
                <tr *ngFor="let it of items.controls; let i = index" [formGroupName]="i">
                  <td>
                    <input type="text" class="form-control form-control-sm" formControlName="name"
                      [ngbTypeahead]="productSearch" [resultFormatter]="productFormatter" [inputFormatter]="productFormatter"
                      (selectItem)="onProductSelected(i, $event.item)" placeholder="Search product" />
                  </td>
                  <td><input type="number" class="form-control form-control-sm" formControlName="qty" min="1" /></td>
                  <td><input type="number" class="form-control form-control-sm" formControlName="price" step="0.01" /></td>
                  <td><input type="number" class="form-control form-control-sm" formControlName="gstPercent" step="0.1" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile stacked view -->
          <div class="d-md-none" formArrayName="items">
            <div class="card mb-2" *ngFor="let it of items.controls; let i = index" [formGroupName]="i">
              <div class="card-body p-2">
                <div class="mb-2">
                  <label class="form-label small mb-1">Product</label>
                  <input type="text" class="form-control form-control-sm" formControlName="name"
                         [ngbTypeahead]="productSearch" [resultFormatter]="productFormatter" [inputFormatter]="productFormatter"
                         (selectItem)="onProductSelected(i, $event.item)" placeholder="Search product" />
                </div>
                <div class="row g-2">
                  <div class="col-4">
                    <label class="form-label small mb-1">Qty</label>
                    <input type="number" class="form-control form-control-sm" formControlName="qty" min="1" />
                  </div>
                  <div class="col-4">
                    <label class="form-label small mb-1">Price</label>
                    <input type="number" class="form-control form-control-sm" formControlName="price" step="0.01" />
                  </div>
                  <div class="col-4">
                    <label class="form-label small mb-1">GST %</label>
                    <input type="number" class="form-control form-control-sm" formControlName="gstPercent" step="0.1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="button" class="btn btn-outline-primary btn-sm" (click)="addItem()">Add Item</button>
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || items.length === 0 || loading">Save Purchase</button>
          <button class="btn btn-outline-secondary" type="button" (click)="reset()">Reset</button>
        </div>
      </form>
    </div>
  </div>

  <div class="card">
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th class="text-end">Due (₹)</th>
              <th class="text-end">Total (₹)</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
      <tbody>
        <tr *ngFor="let p of rows">
          <td>{{ p.date | date:'mediumDate' }}</td>
          <td>{{ p.vendorName || '-' }}</td>
          <td class="text-end">{{ (p.total - (p.paidAmount || 0)) | number:'1.2-2' }}</td>
          <td class="text-end">{{ p.total | number:'1.2-2' }}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-success" (click)="markPaid(p)" [disabled]="(p.paidAmount || 0) >= p.total">Mark Paid</button>
          </td>
        </tr>
        <tr *ngIf="!loading && rows.length === 0">
          <td colspan="5" class="text-center text-muted">No purchases yet.</td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
  `
})
export class PurchasesPage {
  constructor(private fb: FormBuilder, private products: ProductsService, private purchases: PurchasesService) {}

  rows: any[] = [];
  loading = false;

  form = this.fb.group({
    vendorName: [''],
    vendorGstin: [''],
    vendorStateCode: [''],
    items: this.fb.array([])
  });

  get items(): FormArray { return this.form.get('items') as FormArray; }
  addItem() {
    const g = this.fb.group({
      product: this.fb.control<Product | string | null>(null),
      productId: [''],
      name: ['', Validators.required],
      qty: [1, Validators.required],
      price: [0, Validators.required],
      gstPercent: [0]
    });
    this.items.push(g);
  }
  onProductSelected(i: number, p: Product | string | null) {
    if (p && typeof p !== 'string') {
      const g = this.items.at(i);
      g.patchValue({ productId: p._id || '', name: p.name, price: p.price, gstPercent: p.gstPercent });
    }
  }
  productFormatter = (p: Product | string) => typeof p === 'string' ? p : `${p.name} (₹${p.price})`;
  productSearch = (text$: Observable<string>) => text$.pipe(
    debounceTime(200), distinctUntilChanged(),
    switchMap(term => term && term.length >= 2 ? this.products.search(term) : of([])),
    catchError(() => of([]))
  );

  ngOnInit() { this.reload(); if (this.items.length === 0) this.addItem(); }
  reload() {
    this.loading = true;
    this.purchases.list().subscribe({
      next: (data) => { this.rows = data; this.loading = false; },
      error: () => { this.rows = []; this.loading = false; }
    });
  }
  submit() {
    if (this.form.invalid || this.items.length === 0) return;
    const payload = {
      vendorName: this.form.value.vendorName || '',
      vendorGstin: (this.form.value.vendorGstin || '').toUpperCase() || undefined,
      vendorStateCode: (this.form.value.vendorStateCode || '').toUpperCase() || undefined,
      items: this.items.controls.map(c => {
        const it: any = c.value; return { productId: it.productId || undefined, name: it.name, qty: Number(it.qty), price: Number(it.price), gstPercent: Number(it.gstPercent || 0) };
      })
    };
    this.loading = true;
    this.purchases.create(payload).subscribe({
      next: () => { this.loading = false; this.reset(); this.reload(); this.formVisible = false; alert('Purchase saved'); },
      error: () => { this.loading = false; alert('Failed to save'); }
    });
  }
  reset() { this.form.reset({ vendorName: '' }); this.items.clear(); this.addItem(); }
  cancel() { this.formVisible = false; }

  upper(field: 'vendorGstin') {
    const c = this.form.get(field);
    if (c && typeof c.value === 'string') c.setValue(c.value.toUpperCase());
  }

  // Common states list (subset) used for vendor state selection
  states = [
    { code: 'AN', name: 'Andaman & Nicobar' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CG', name: 'Chhattisgarh' },
    { code: 'DL', name: 'Delhi' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JK', name: 'Jammu & Kashmir' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OD', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TS', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UK', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' }
  ];

  markPaid(p: any) {
    if (!p?._id) return;
    this.purchases.pay(p._id, p.total).subscribe({ next: () => this.reload() });
  }

  formVisible = false;
}
