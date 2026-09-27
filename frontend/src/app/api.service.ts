import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Product, Category, Session, User, Order, CartLine } from './models';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  products(q = '', category = '') {
    return this.http.get<Product[]>('/api/products', { params: { q: q.trim(), category } });
  }
  product(id: string) {
    return this.http.get<Product>('/api/products/' + encodeURIComponent(id));
  }
  categories() {
    return this.http.get<Category[]>('/api/categories');
  }
  authenticate(mode: 'login' | 'register', email: string, password: string) {
    return this.http.post<Session>('/api/auth/' + mode, { email, password });
  }
  profile(token: string) {
    return this.http.get<User>('/api/me', { headers: { Authorization: 'Bearer ' + token } });
  }
  order(lines: CartLine[]) {
    return this.http.post<Order>('/api/orders', {
      items: lines.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
        expectedPriceCents: line.product.priceCents,
      })),
    });
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string')
    return error.error.error;
  return 'No podemos conectar con la tienda. Comprueba que el servidor local esté encendido y vuelve a intentarlo.';
}
