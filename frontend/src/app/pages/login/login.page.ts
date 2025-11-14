import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  template: `
  <h4>Login</h4>
  <form [formGroup]="form" (ngSubmit)="submit()" class="row g-3" style="max-width:480px">
    <div class="col-12">
      <label class="form-label">Email</label>
      <input type="email" class="form-control" formControlName="email" required />
    </div>
    <div class="col-12">
      <label class="form-label">Password</label>
      <input type="password" class="form-control" formControlName="password" required />
    </div>
    <div class="col-12">
      <button class="btn btn-primary" [disabled]="form.invalid || loading" type="submit">{{ loading ? 'Signing in...' : 'Login' }}</button>
      <a class="btn btn-link" routerLink="/register">Create account</a>
    </div>
    <div class="col-12" *ngIf="error">
      <div class="alert alert-danger">{{ error }}</div>
    </div>
  </form>
  `,
  imports: [ReactiveFormsModule, NgIf, RouterLink]
})
export class LoginPage {
  loading = false;
  error = '';
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value as { email: string; password: string };
    this.loading = true;
    this.error = '';
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/invoices');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Login failed';
      }
    });
  }
}
