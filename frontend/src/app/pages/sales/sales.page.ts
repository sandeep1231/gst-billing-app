import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceListComponent } from '../../shared/invoice-list/invoice-list.component';
import { InvoiceFormComponent } from '../../shared/invoice-form/invoice-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, InvoiceListComponent, InvoiceFormComponent],
  template: `
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0">Sales</h4>
    <button class="btn btn-primary" (click)="formVisible = true" *ngIf="!formVisible">Create Invoice</button>
  </div>

  <div class="card mb-3" *ngIf="formVisible">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h5 class="mb-0">New Invoice</h5>
        <button class="btn btn-sm btn-outline-secondary" (click)="formVisible = false">Cancel</button>
      </div>
      <app-invoice-form (created)="onCreated()"></app-invoice-form>
    </div>
  </div>

  <div class="card">
    <div class="card-body">
      <app-invoice-list #list></app-invoice-list>
    </div>
  </div>
  `
})
export class SalesPage {
  formVisible = false;
  list?: InvoiceListComponent;
  onCreated() { this.formVisible = false; (this.list as any)?.reload?.(); }
}
