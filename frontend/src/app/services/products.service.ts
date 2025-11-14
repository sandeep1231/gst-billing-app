import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Product {
  _id?: string;
  name: string;
  price: number;
  gstPercent: number;
  unit?: string;
  hsn?: string;
  openingQty?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private api: ApiService) {}
  search(term: string): Observable<Product[]> {
    return this.api.get<Product[]>('/products', { query: term }).pipe(map(r => r || []));
  }
  create(body: Partial<Product>) { return this.api.post<Product>('/products', body); }
  update(id: string, body: Partial<Product>) { return this.api.put<Product>(`/products/${id}`, body); }
  remove(id: string) { return this.api.delete(`/products/${id}`); }
}
