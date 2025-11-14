import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Customer {
  _id?: string;
  name: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; pincode?: string };
  gstin?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  constructor(private api: ApiService) {}
  search(term: string): Observable<Customer[]> {
    return this.api.get<Customer[]>('/customers', { query: term }).pipe(map(r => r || []));
  }
  list(query = '', page = 1, limit = 20) {
    return this.api.get<Customer[]>('/customers', { query, page, limit });
  }
  create(body: Partial<Customer>) {
    return this.api.post<Customer>('/customers', body);
  }
  update(id: string, body: Partial<Customer>) {
    return this.api.put<Customer>(`/customers/${id}`, body);
  }
  remove(id: string) {
    return this.api.delete(`/customers/${id}`);
  }
}
