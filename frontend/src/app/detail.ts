import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from './api.service';
import { CartService } from './cart.service';
import { Product } from './models';
import { MoneyPipe } from './money.pipe';
@Component({
  selector: 'app-detail',
  imports: [RouterLink, MoneyPipe],
  template: ` <section class="section">
    <a routerLink="/productos" class="text-link">← Volver al menú</a>
    @if (loading()) {
      <p class="state-box" role="status">Buscando tu antojo…</p>
    } @else if (error()) {
      <div class="state-box" role="alert">
        <h1>No se pudo mostrar el producto</h1>
        <p>{{ error() }}</p>
        <button class="button" (click)="load()">Reintentar</button>
      </div>
    } @else if (product(); as p) {
      <div class="detail-grid">
        <img [src]="'/art/' + p.image + '.svg'" [alt]="p.name" width="480" height="340" />
        <div>
          <p class="eyebrow">{{ p.portion }}</p>
          <h1>{{ p.name }}</h1>
          <p>{{ p.description }}</p>
          <p class="detail-price">{{ p.priceCents | money }}</p>
          <p>
            {{
              p.available
                ? 'Disponible para tu pedido de demostración.'
                : 'Este producto volverá pronto.'
            }}
          </p>
          <button class="button" [disabled]="!p.available" (click)="cart.add(p)">
            Añadir al carrito
          </button>
          <p class="muted">
            Consulta los ingredientes y alérgenos en la tienda. Productos de ejemplo.
          </p>
        </div>
      </div>
    }
  </section>`,
})
export class Detail {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  cart = inject(CartService);
  product = signal<Product | null>(null);
  loading = signal(true);
  error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .product(this.route.snapshot.paramMap.get('id') || '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.product.set(p);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
}
