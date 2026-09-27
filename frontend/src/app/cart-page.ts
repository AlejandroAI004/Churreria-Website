import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from './cart.service';
import { ApiService, errorMessage } from './api.service';
import { MoneyPipe } from './money.pipe';
import { Order } from './models';
@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, MoneyPipe],
  template: ` <section class="page-heading">
      <p class="eyebrow">CASI PUEDES OLERLOS</p>
      <h1>Tu bolsita de felicidad.</h1>
      <p>Un último vistazo a tus favoritos.</p>
    </section>
    <section class="section">
      @if (confirmation(); as order) {
        <div class="state-box confirmation" role="status">
          <span class="state-icon" aria-hidden="true">✓</span>
          <p class="eyebrow">TODO LISTO</p>
          <h2>¡Pedido de demostración confirmado!</h2>
          <p>No se ha realizado ningún cobro ni se preparará un pedido real.</p>
          <p>
            Referencia: <strong>{{ order.id.slice(0, 8) }}</strong> · Total:
            <strong>{{ order.totalCents | money }}</strong>
          </p>
          <a routerLink="/productos" class="button">Volver al menú</a>
        </div>
      } @else if (!cart.lines().length) {
        <div class="state-box">
          <span class="state-icon" aria-hidden="true">♡</span>
          <h2>Tu carrito espera algo rico</h2>
          <p>Empieza por los clásicos o déjate tentar por un relleno.</p>
          <a routerLink="/productos" class="button">Explorar productos</a>
        </div>
      } @else {
        <div class="cart-layout">
          <div>
            <div class="cart-list-header">
              <h2>
                Tus favoritos <span>({{ cart.count() }})</span>
              </h2>
              <button class="text-button" [disabled]="busy()" (click)="cart.clear()">
                Vaciar carrito
              </button>
            </div>
            @for (line of cart.lines(); track line.product.id) {
              <article class="cart-line">
                <img
                  [src]="'/art/' + line.product.image + '.svg'"
                  alt=""
                  width="120"
                  height="100"
                />
                <div class="cart-line-info">
                  <h3>{{ line.product.name }}</h3>
                  <p>{{ line.product.priceCents | money }} / unidad</p>
                  @if (!line.product.available) {
                    <span class="error-text">Ya no está disponible. Elimínalo para continuar.</span>
                  }
                  <button
                    class="text-button"
                    [disabled]="busy()"
                    [attr.aria-label]="'Eliminar ' + line.product.name"
                    (click)="cart.remove(line.product.id)"
                  >
                    Eliminar
                  </button>
                </div>
                <div
                  class="quantity"
                  role="group"
                  [attr.aria-label]="'Cantidad de ' + line.product.name"
                >
                  <button
                    [disabled]="busy()"
                    [attr.aria-label]="'Reducir ' + line.product.name"
                    (click)="cart.quantity(line.product.id, line.quantity - 1)"
                  >
                    −</button
                  ><span>{{ line.quantity }}</span
                  ><button
                    [disabled]="busy() || line.quantity >= 99"
                    [attr.aria-label]="'Aumentar ' + line.product.name"
                    (click)="cart.quantity(line.product.id, line.quantity + 1)"
                  >
                    +
                  </button>
                </div>
                <strong class="line-subtotal">{{
                  line.product.priceCents * line.quantity | money
                }}</strong>
              </article>
            }
            <a routerLink="/productos" class="text-link">← Seguir eligiendo</a>
          </div>
          <aside class="order-summary">
            <p class="eyebrow">EL BUEN RATO EMPIEZA AQUÍ</p>
            <h2>Tu pedido</h2>
            <div>
              <span>{{ cart.count() }} unidades</span><span>{{ cart.total() | money }}</span>
            </div>
            <div class="total">
              <strong>Total</strong><strong>{{ cart.total() | money }}</strong>
            </div>
            <p class="muted">Precios de ejemplo, IVA incluido.</p>
            <button
              class="button"
              [disabled]="busy() || checking() || !verified() || unavailable()"
              (click)="checkout()"
            >
              {{ busy() ? 'Confirmando…' : 'Confirmar pedido de demostración' }}
            </button>
            <p class="demo-note">
              Sin pagos. Sin cuenta obligatoria.<br />Solo un pequeño experimento dulce.
            </p>
          </aside>
        </div>
        @if (checking()) {
          <p role="status">Comprobando precios y disponibilidad…</p>
        }
        @if (error()) {
          <div class="error-banner" role="alert">
            {{ error() }}
            <button class="text-button" (click)="refresh()" [disabled]="busy() || checking()">
              Actualizar carrito
            </button>
          </div>
        }
      }
    </section>`,
})
export class CartPage {
  cart = inject(CartService);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  busy = signal(false);
  checking = signal(false);
  verified = signal(false);
  error = signal('');
  confirmation = signal<Order | null>(null);
  unavailable = computed(() => this.cart.lines().some((line) => !line.product.available));
  constructor() {
    if (this.cart.lines().length) this.refresh();
  }
  refresh() {
    this.checking.set(true);
    this.verified.set(false);
    this.error.set('');
    this.api
      .products()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.cart.reconcile(products);
          this.verified.set(true);
          this.checking.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.checking.set(false);
        },
      });
  }
  checkout() {
    if (
      this.busy() ||
      !this.verified() ||
      this.checking() ||
      this.unavailable() ||
      !this.cart.lines().length
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .order(this.cart.lines())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.confirmation.set(order);
          this.cart.clear();
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
          this.verified.set(false);
        },
      });
  }
}
