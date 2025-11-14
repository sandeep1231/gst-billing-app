import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CustomersService, Customer } from '../../services/customers.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0">Customers</h4>
    <button class="btn btn-primary" (click)="startCreate()" *ngIf="!formVisible">Add Customer</button>
  </div>

  <div class="card mb-3" *ngIf="formVisible">
    <div class="card-body">
      <form [formGroup]="form" (ngSubmit)="save()" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Name</label>
          <input class="form-control" formControlName="name" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Phone</label>
          <input class="form-control" formControlName="phone" />
        </div>
        <div class="col-md-3">
          <label class="form-label">GSTIN</label>
          <input class="form-control" formControlName="gstin" (blur)="upper('gstin')" [class.is-invalid]="gstinInvalid()" />
          <div class="invalid-feedback" *ngIf="gstinInvalid()">Invalid GSTIN format</div>
        </div>
        <div class="col-md-6">
          <label class="form-label">Address Line 1</label>
          <input class="form-control" formControlName="line1" />
        </div>
        <div class="col-md-3">
          <label class="form-label">City</label>
          <input class="form-control" formControlName="city" />
        </div>
        <div class="col-md-3">
          <label class="form-label">PIN Code</label>
          <input class="form-control" formControlName="pincode" />
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving">{{ editId ? 'Update' : 'Create' }}</button>
          <button class="btn btn-outline-secondary" type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <form class="row g-2 mb-2" (ngSubmit)="apply()">
    <div class="col-md-4"><input class="form-control" [(ngModel)]="query" name="query" placeholder="Search customers..." /></div>
    <div class="col-md-2 d-grid"><button class="btn btn-outline-secondary" type="submit">Apply</button></div>
  </form>

  <div class="card">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>GSTIN</th>
            <th>Address</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of items">
            <td>{{ c.name }}</td>
            <td>{{ c.phone }}</td>
            <td>{{ c.gstin }}</td>
            <td>{{ c.address?.line1 }}<span *ngIf="c.address?.city">, {{ c.address?.city }}</span> <span *ngIf="c.address?.pincode">- {{ c.address?.pincode }}</span></td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-2" (click)="startEdit(c)">Edit</button>
              <button class="btn btn-sm btn-outline-danger" (click)="remove(c)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="items.length===0"><td colspan="5" class="text-center text-muted py-4">No customers</td></tr>
        </tbody>
      </table>
    </div>
    <div class="card-footer d-flex align-items-center gap-2">
      <div class="me-auto text-muted">Page {{ page }}</div>
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-secondary" (click)="prev()" [disabled]="page<=1">Prev</button>
        <button class="btn btn-sm btn-outline-secondary" (click)="next()" [disabled]="lastCount<limit">Next</button>
      </div>
    </div>
  </div>
  `
})
export class CustomersPage {
  private svc = inject(CustomersService);
  private fb = inject(FormBuilder);

  items: Customer[] = [];
  page = 1;
  limit = 20;
  lastCount = 0;
  query = '';
  formVisible = false;
  saving = false;
  editId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    phone: [''],
    gstin: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/)]],
    line1: [''],
    city: [''],
    pincode: ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.svc.list(this.query, this.page, this.limit).subscribe({
      next: (data) => { this.items = data; this.lastCount = data.length; },
      error: () => { this.items = []; this.lastCount = 0; }
    });
  }
  apply() { this.page = 1; this.load(); }
  prev() { if (this.page>1) { this.page--; this.load(); } }
  next() { if (this.lastCount>=this.limit) { this.page++; this.load(); } }

  startCreate() {
    this.form.reset({ name: '', phone: '', gstin: '', line1: '', city: '', pincode: '' });
    this.editId = null; this.formVisible = true;
  }
  startEdit(c: Customer) {
    this.form.patchValue({
      name: c.name || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      line1: c.address?.line1 || '',
      city: c.address?.city || '',
      pincode: c.address?.pincode || ''
    });
    this.editId = c._id || null; this.formVisible = true;
  }
  cancel() { this.formVisible = false; this.editId = null; }

  gstinInvalid() {
    const ctrl = this.form.get('gstin');
    return !!ctrl && ctrl.touched && ctrl.value && ctrl.invalid;
  }
  upper(field: 'gstin') { const c = this.form.get(field); if (c && typeof c.value==='string') c.setValue(c.value.toUpperCase()); }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const body: Partial<Customer> = {
      name: v.name!,
      phone: v.phone || undefined,
      gstin: (v.gstin || '').toUpperCase() || undefined,
      address: {
        line1: v.line1 || undefined,
        city: v.city || undefined,
        pincode: v.pincode || undefined
      }
    };
    const req = this.editId ? this.svc.update(this.editId, body) : this.svc.create(body);
    req.subscribe({
      next: () => { this.saving = false; this.formVisible = false; this.load(); },
      error: () => { this.saving = false; }
    });
  }

  remove(c: Customer) {
    if (!c._id) return;
    if (!confirm(`Delete customer '${c.name}'?`)) return;
    this.svc.remove(c._id).subscribe({ next: () => this.load() });
  }
}
