import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiService, errorMessage } from './api.service';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { MoneyPipe } from './money.pipe';
import { CART_KEY } from './cart.logic';
import { Product } from './models';
import { HttpErrorResponse } from '@angular/common/http';
const product: Product = {
  id: 1,
  name: 'Churros',
  description: 'Clásicos',
  priceCents: 350,
  category: 'clasicos',
  available: true,
  image: 'clasicos',
  portion: '6 unidades',
};
describe('servicios Angular y contratos de API', () => {
  let api: ApiService, http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it('envía la búsqueda y categoría y devuelve el catálogo del servidor', () => {
    let result: Product[] = [];
    api.products(' café ', 'bebidas').subscribe((value) => (result = value));
    const req = http.expectOne(
      (r) =>
        r.url === '/api/products' &&
        r.params.get('q') === 'café' &&
        r.params.get('category') === 'bebidas',
    );
    req.flush([product]);
    expect(result).toEqual([product]);
  });
  it('soporta resultados vacíos y detalle individual', () => {
    let result: Product[] = [product];
    api.products('no existe').subscribe((value) => (result = value));
    http.expectOne((r) => r.url === '/api/products').flush([]);
    expect(result).toEqual([]);
    api.product('1').subscribe((value) => expect(value).toEqual(product));
    http.expectOne('/api/products/1').flush(product);
  });
  it('obtiene categorías desde el backend', () => {
    api
      .categories()
      .subscribe((value) => expect(value).toEqual([{ id: 'clasicos', name: 'Clásicos' }]));
    http.expectOne('/api/categories').flush([{ id: 'clasicos', name: 'Clásicos' }]);
  });
  it('muestra mensajes claros del servidor y de conexión', () => {
    expect(
      errorMessage(new HttpErrorResponse({ status: 409, error: { error: 'Precio cambiado' } })),
    ).toBe('Precio cambiado');
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('servidor local');
  });
  it('envía IDs, cantidades y precios esperados sin confiar en un total del cliente', () => {
    api.order([{ product, quantity: 2 }]).subscribe();
    const req = http.expectOne('/api/orders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      items: [{ productId: 1, quantity: 2, expectedPriceCents: 350 }],
    });
    req.flush({ id: 'order', totalCents: 700, demo: true, message: 'OK' });
  });
  it('registra, consulta el perfil con JWT y cierra la sesión', () => {
    const auth = TestBed.inject(AuthService);
    auth.authenticate('register', 'a@b.es', 'password123').subscribe();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body.email).toBe('a@b.es');
    req.flush({ user: { id: 1, email: 'a@b.es' }, token: 'local-token' });
    expect(auth.user()?.email).toBe('a@b.es');
    auth.profile().subscribe();
    const profile = http.expectOne('/api/me');
    expect(profile.request.headers.get('Authorization')).toBe('Bearer local-token');
    profile.flush({ id: 1, email: 'a@b.es', createdAt: '2026-01-01' });
    auth.logout();
    expect(auth.user()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it('propaga credenciales inválidas sin abrir una sesión', () => {
    const auth = TestBed.inject(AuthService);
    let status = 0;
    auth
      .authenticate('login', 'a@b.es', 'badpassword')
      .subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne('/api/auth/login')
      .flush({ error: 'Incorrecto' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.user()).toBeNull();
  });
  it('persiste cambios, restaura cantidades y recalcula total', () => {
    const cart = TestBed.inject(CartService);
    cart.add(product);
    cart.quantity(1, 3);
    expect(cart.count()).toBe(3);
    expect(cart.total()).toBe(1050);
    expect(new CartService().lines()[0].quantity).toBe(3);
    cart.remove(1);
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([]);
    cart.add(product);
    cart.clear();
    expect(cart.total()).toBe(0);
  });
  it('reconcilia precios y disponibilidad con el catálogo actual', () => {
    const cart = TestBed.inject(CartService);
    cart.add(product);
    cart.reconcile([{ ...product, priceCents: 450 }]);
    expect(cart.total()).toBe(450);
    cart.reconcile([]);
    expect(cart.lines()[0].product.available).toBe(false);
  });
  it('conserva el carrito en memoria si localStorage falla', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const cart = TestBed.inject(CartService);
    cart.add(product);
    expect(cart.count()).toBe(1);
    expect(cart.storageWarning()).toContain('No se pudo guardar');
  });
  it('tolera lectura de almacenamiento bloqueada y productos agotados', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const cart = new CartService();
    expect(cart.storageWarning()).toContain('no permite');
    cart.add({ ...product, available: false });
    expect(cart.count()).toBe(0);
    expect(cart.notice()).toContain('no está disponible');
  });
  it('formatea euros desde céntimos', () => {
    expect(new MoneyPipe().transform(350).replace(/\s/g, ' ')).toBe('3,50 €');
  });
});
