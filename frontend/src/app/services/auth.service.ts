import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'auth_token';
  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.KEY, res.token);
      })
    );
  }

  register(email: string, password: string, shopName?: string, stateCode?: string, gstin?: string, address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string }) {
    return this.http.post<{ token: string }>(`${environment.apiUrl}/auth/register`, { email, password, shopName, stateCode, gstin, address }).pipe(
      tap((res) => localStorage.setItem(this.KEY, res.token))
    );
  }

  get token(): string | null {
    return localStorage.getItem(this.KEY);
  }

  logout() {
    localStorage.removeItem(this.KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
}
