import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../services/company.service';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="d-flex align-items-center mb-3">
    <h4 class="m-0">Company Settings</h4>
  </div>

  <form [formGroup]="form" (ngSubmit)="save()" class="row g-3">
    <div class="col-md-6">
      <label class="form-label">Company Name</label>
      <input class="form-control" formControlName="name" />
    </div>
    <div class="col-md-3">
      <label class="form-label">GSTIN</label>
      <input class="form-control" [class.is-invalid]="gstinInvalid()" formControlName="gstin" (blur)="uppercase('gstin')" />
      <div class="invalid-feedback" *ngIf="gstinInvalid()">Invalid GSTIN format</div>
    </div>
    <div class="col-md-3">
      <label class="form-label">State Code</label>
      <select class="form-select" formControlName="stateCode">
        <option value="">-- Select --</option>
        <option *ngFor="let s of states" [value]="s.code">{{ s.name }} ({{ s.code }})</option>
      </select>
    </div>

    <div class="col-md-6">
      <label class="form-label">Address Line 1</label>
      <input class="form-control" formControlName="line1" />
    </div>
    <div class="col-md-6">
      <label class="form-label">Address Line 2</label>
      <input class="form-control" formControlName="line2" />
    </div>
    <div class="col-md-4">
      <label class="form-label">City</label>
      <input class="form-control" formControlName="city" />
    </div>
    <div class="col-md-4">
      <label class="form-label">State</label>
      <input class="form-control" formControlName="state" />
    </div>
    <div class="col-md-4">
      <label class="form-label">PIN Code</label>
      <input class="form-control" formControlName="pincode" />
    </div>

    <div class="col-12 d-flex gap-2">
      <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">Save</button>
      <button type="button" class="btn btn-outline-secondary" (click)="reload()" [disabled]="saving">Reload</button>
      <div class="ms-auto" *ngIf="saved" style="align-self:center; color: #198754;">Saved.</div>
    </div>
  </form>
  `
})
export class SettingsPage {
  private fb = inject(FormBuilder);
  private svc = inject(CompanyService);

  saving = false;
  saved = false;
  // Common Indian states/UTs with 2-letter codes used in this app
  states = [
    { code: 'AN', name: 'Andaman & Nicobar' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CH', name: 'Chandigarh' },
    { code: 'CT', name: 'Chhattisgarh' },
    { code: 'DL', name: 'Delhi' },
    { code: 'DN', name: 'Dadra & Nagar Haveli and Daman & Diu' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'HR', name: 'Haryana' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'JK', name: 'Jammu & Kashmir' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'LA', name: 'Ladakh' },
    { code: 'LD', name: 'Lakshadweep' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MN', name: 'Manipur' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OD', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' },
    { code: 'PY', name: 'Puducherry' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UK', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' }
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    gstin: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/)]],
    stateCode: [''],
    line1: [''],
    line2: [''],
    city: [''],
    state: [''],
    pincode: ['']
  });

  ngOnInit() { this.reload(); }

  reload() {
    this.saved = false;
    this.svc.getMe().subscribe({
      next: (c) => {
        this.form.patchValue({
          name: c.name,
          gstin: c.gstin || '',
          stateCode: c.stateCode || '',
          line1: c.address?.line1 || '',
          line2: c.address?.line2 || '',
          city: c.address?.city || '',
          state: c.address?.state || '',
          pincode: c.address?.pincode || ''
        });
      }
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const body = {
      name: v.name!,
      gstin: (v.gstin || '').toUpperCase() || undefined,
      stateCode: (v.stateCode || '').toUpperCase() || undefined,
      address: {
        line1: v.line1 || undefined,
        line2: v.line2 || undefined,
        city: v.city || undefined,
        state: v.state || undefined,
        pincode: v.pincode || undefined
      }
    };
    this.svc.updateMe(body).subscribe({
      next: () => { this.saving = false; this.saved = true; },
      error: () => { this.saving = false; this.saved = false; }
    });
  }
  gstinInvalid() {
    const c = this.form.get('gstin');
    return !!c && c.touched && c.value && c.invalid;
  }
  uppercase(field: 'gstin') {
    const c = this.form.get(field);
    if (c && typeof c.value === 'string') c.setValue(c.value.toUpperCase());
  }
}
