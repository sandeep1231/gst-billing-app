import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  template: `
  <h4>Create account</h4>
  <form [formGroup]="form" (ngSubmit)="submit()" class="row g-3" style="max-width:640px">
    <div class="col-md-6">
      <label class="form-label">Email</label>
      <input type="email" class="form-control" formControlName="email" required />
    </div>
    <div class="col-md-6">
      <label class="form-label">Password</label>
      <input type="password" class="form-control" formControlName="password" required />
    </div>

    <div class="col-md-6">
      <label class="form-label">Company/Shop Name</label>
      <input type="text" class="form-control" formControlName="shopName" required />
    </div>
    <div class="col-md-6">
      <label class="form-label">State Code (e.g., KA)</label>
      <input type="text" class="form-control" formControlName="stateCode" maxlength="2" />
    </div>

    <div class="col-md-6">
      <label class="form-label">GSTIN (optional)</label>
      <input type="text" class="form-control" formControlName="gstin" />
    </div>

    <div class="col-12"><strong>Address (optional)</strong></div>
    <div class="col-12">
      <label class="form-label">Address Line 1</label>
      <input type="text" class="form-control" formControlName="line1" />
    </div>
    <div class="col-md-4">
      <label class="form-label">City</label>
      <input type="text" class="form-control" formControlName="city" />
    </div>
    <div class="col-md-4">
      <label class="form-label">State</label>
      <input type="text" class="form-control" formControlName="state" />
    </div>
    <div class="col-md-4">
      <label class="form-label">Pincode</label>
      <input type="text" class="form-control" formControlName="pincode" />
    </div>

    <div class="col-12 d-flex gap-2">
      <button class="btn btn-primary" [disabled]="form.invalid || loading" type="submit">{{ loading ? 'Creating...' : 'Sign up' }}</button>
      <a class="btn btn-outline-secondary" routerLink="/login">Back to login</a>
    </div>
    <div class="col-12" *ngIf="error">
      <div class="alert alert-danger">{{ error }}</div>
    </div>
  </form>
  `,
  imports: [ReactiveFormsModule, NgIf, RouterLink]
})
export class RegisterPage {
  loading = false;
  error = '';
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    shopName: ['', [Validators.required]],
    stateCode: [''],
    gstin: [''],
    line1: [''],
    city: [''],
    state: [''],
    pincode: ['']
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const v = this.form.value as any;
    const address = v.line1 || v.city || v.state || v.pincode ? { line1: v.line1, city: v.city, state: v.state, pincode: v.pincode } : undefined;
    this.auth.register(v.email, v.password, v.shopName, v.stateCode, v.gstin, address).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/invoices');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Sign up failed';
      }
    });
  }
}
