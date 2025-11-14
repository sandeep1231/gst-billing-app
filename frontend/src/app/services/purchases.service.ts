import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface PurchaseItem { productId?: string; name: string; qty: number; price: number; gstPercent?: number; }
export interface Purchase { _id?: string; vendorName?: string; vendorGstin?: string; vendorStateCode?: string; date?: string; items: PurchaseItem[]; subTotal?: number; total?: number; notes?: string; }

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  constructor(private api: ApiService) {}
  list(page = 1, limit = 20) { return this.api.get<Purchase[]>('/purchases', { page, limit }); }
  create(body: Partial<Purchase>) { return this.api.post<Purchase>('/purchases', body); }
  pay(id: string, paidAmount: number) { return this.api.put<Purchase>(`/purchases/${id}/payment`, { paidAmount }); }
}
