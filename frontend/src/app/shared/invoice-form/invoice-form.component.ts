import { Component, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { CommonModule, NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { CustomersService, Customer } from '../../services/customers.service';
import { ProductsService, Product } from '../../services/products.service';
import { ApiService } from '../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-invoice-form',
  imports: [CommonModule, ReactiveFormsModule, NgbTypeaheadModule, NgIf, NgFor],
  templateUrl: './invoice-form.component.html'
})
export class InvoiceFormComponent {
  @Output() created = new EventEmitter<any>();
  constructor(private fb: FormBuilder, private customers: CustomersService, private products: ProductsService, private api: ApiService) {}

  form = this.fb.group({
  // customer selection is optional (allow walk-in invoices)
  customer: this.fb.control<string | null>(null),
    customerId: [''],
    customerName: [''],
    mobile: [''],
    address: [''],
    gstin: [''],
    items: this.fb.array([]),
    notes: ['']
  });

  formatter = (c: Customer | string) => typeof c === 'string' ? c : `${c.name}${c.phone ? ' - ' + c.phone : ''}`;

  // search customers using backend (requires login)
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => (term && term.length >= 2 ? this.customers.search(term) : of([]))),
      catchError(() => of([]))
    );

  productFormatter = (p: Product | string) => typeof p === 'string' ? p : `${p.name} (₹${p.price})`;
  productSearch = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => (term && term.length >= 2 ? this.products.search(term) : of([]))),
      catchError(() => of([]))
    );

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem(prefill?: Partial<{ name: string; price: number; gstPercent: number; qty: number; productId?: string }>) {
    const g = this.fb.group({
      product: this.fb.control<Product | string | null>(null),
      productId: [prefill?.productId || ''],
      name: [prefill?.name || '', Validators.required],
      qty: [prefill?.qty ?? 1, [Validators.required]],
      price: [prefill?.price ?? 0, [Validators.required]],
      gstPercent: [prefill?.gstPercent ?? 0, [Validators.required]]
    });
    this.items.push(g);
  }

  removeItem(i: number) { this.items.removeAt(i); }

  onProductSelected(i: number, p: Product | string | null) {
    if (p && typeof p !== 'string') {
      const g = this.items.at(i);
      g.patchValue({ productId: p._id || '', name: p.name, price: p.price, gstPercent: p.gstPercent });
    }
  }

  get subTotal(): number {
    return this.items.controls.reduce((sum, c) => {
      const v: any = c.value; return sum + (Number(v.price) * Number(v.qty));
    }, 0);
  }
  get totalTax(): number {
    return this.items.controls.reduce((sum, c) => {
      const v: any = c.value; const line = Number(v.price) * Number(v.qty); return sum + (line * Number(v.gstPercent) / 100);
    }, 0);
  }
  get total(): number { return this.subTotal + this.totalTax; }

  ngOnInit() {
    if (this.items.length === 0) this.addItem();
  }

  onCustomerSelected(c: Customer | string | null) {
    if (c && typeof c !== 'string') {
      this.form.patchValue({
        customerId: c._id || '',
        customerName: c.name || '',
        mobile: c.phone || '',
        address: (c.address?.line1 || ''),
        gstin: c.gstin || ''
      });
    }
  }

  submit() {
    if (this.form.invalid || this.items.length === 0) return;
    const v = this.form.value as any;
    const items = this.items.controls.map(c => {
      const it: any = c.value;
      return {
        productId: it.productId || undefined,
        name: it.name,
        qty: Number(it.qty),
        price: Number(it.price),
        gstPercent: Number(it.gstPercent)
      };
    });
    // Prepare manual snapshot when no customer is selected from search
    const typedName = (v.customerName?.trim() || (typeof v.customer === 'string' ? v.customer.trim() : '')) as string;
    const customerSnapshot = typedName
      ? {
          name: typedName,
          phone: v.mobile || '',
          gstin: v.gstin || '',
          address: v.address || ''
        }
      : undefined;
    const payload: any = {
      customerId: this.form.value.customerId || undefined,
      items,
      notes: v.notes || ''
    };
    if (!payload.customerId && customerSnapshot) {
      payload.customerSnapshot = customerSnapshot;
    }
    this.api.post<any>('/invoices', payload).subscribe({
      next: (res) => {
        console.log('Invoice created', res);
        this.lastInvoiceId = res?._id || null;
        this.lastInvoiceNo = res?.invoiceNo || '';
        alert(`Invoice created: ${this.lastInvoiceNo || this.lastInvoiceId}`);
        this.created.emit(res);
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create invoice');
      }
    });
  }

  lastInvoiceId: string | null = null;
  lastInvoiceNo = '';

  downloadPdf() {
    if (!this.lastInvoiceId) return;
    this.api.getBlob(`/invoices/${this.lastInvoiceId}/pdf`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.lastInvoiceNo || 'Invoice'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        alert('Failed to download PDF');
      }
    });
  }

}
