import { Injectable, computed, signal } from '@angular/core';
import { Product, CartLine } from './models';
import {
  addProduct,
  changeQuantity,
  removeProduct,
  cartTotal,
  clearCart,
  restoreCart,
  CART_KEY,
} from './cart.logic';
@Injectable({ providedIn: 'root' })
export class CartService {
  private state = signal<CartLine[]>([]);
  readonly lines = this.state.asReadonly();
  readonly total = computed(() => cartTotal(this.lines()));
  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly storageWarning = signal('');
  readonly notice = signal('');
  constructor() {
    try {
      this.state.set(restoreCart(localStorage.getItem(CART_KEY)));
    } catch {
      this.storageWarning.set(
        'El navegador no permite guardar el carrito. Se conservará mientras esta página siga abierta.',
      );
    }
  }
  private save(lines: CartLine[]) {
    this.state.set(lines);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      this.storageWarning.set('No se pudo guardar el carrito en este navegador.');
    }
  }
  add(product: Product) {
    try {
      this.save(addProduct(this.lines(), product));
      this.notice.set(product.name + ' añadido al carrito.');
    } catch (error) {
      this.notice.set((error as Error).message);
    }
  }
  quantity(id: number, value: number) {
    this.save(changeQuantity(this.lines(), id, value));
  }
  remove(id: number) {
    this.save(removeProduct(this.lines(), id));
  }
  clear() {
    this.save(clearCart());
  }
  reconcile(products: Product[]) {
    const result = this.lines().map((line) => ({
      ...line,
      product: products.find((p) => p.id === line.product.id) ?? {
        ...line.product,
        available: false,
      },
    }));
    this.save(result);
  }
}
