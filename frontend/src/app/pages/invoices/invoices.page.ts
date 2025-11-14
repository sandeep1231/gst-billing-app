import { Component, ViewChild } from '@angular/core';
import { InvoiceFormComponent } from '../../shared/invoice-form/invoice-form.component';
import { InvoiceListComponent } from '../../shared/invoice-list/invoice-list.component';

@Component({
  standalone: true,
  selector: 'app-invoices-page',
  template: `
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0">Invoices</h4>
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

  <app-invoice-list #list></app-invoice-list>
  `,
  imports: [InvoiceFormComponent, InvoiceListComponent]
})
export class InvoicesPage {
  @ViewChild('list') list?: InvoiceListComponent;
  formVisible = false;
  onCreated() { this.formVisible = false; this.list?.reload(); }
}
