import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface CompanyAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface Company {
  _id: string;
  name: string;
  gstin?: string;
  stateCode?: string;
  address?: CompanyAddress;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private api = inject(ApiService);

  getMe() {
    return this.api.get<Company>('/company/me');
  }

  updateMe(body: Partial<Company>) {
    return this.api.put<Company>('/company/me', body);
  }
}
