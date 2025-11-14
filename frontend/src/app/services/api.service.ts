import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>) {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p = p.set(k, String(v));
    });
    return this.http.get<T>(`${this.base}${path}`, { params: p });
  }
  post<T>(path: string, body: any, headers?: HttpHeaders) {
    return this.http.post<T>(`${this.base}${path}`, body, { headers });
  }
  put<T>(path: string, body: any) {
    return this.http.put<T>(`${this.base}${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  getBlob(path: string, params?: Record<string, any>) {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p = p.set(k, String(v));
    });
    return this.http.get(`${this.base}${path}`, { responseType: 'blob', params: p });
  }
}
