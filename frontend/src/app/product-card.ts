import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from './models';
import { MoneyPipe } from './money.pipe';
import { CartService } from './cart.service';
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MoneyPipe],
  template: `
    <article class="product-card">
      <a
        class="product-art"
        [routerLink]="['/productos', product().id]"
        [attr.aria-label]="'Ver ' + product().name"
      >
        <img
          [src]="'/art/' + product().image + '.svg'"
          [alt]="product().name"
          loading="lazy"
          width="480"
          height="340"
        />
        @if (!product().available) {
          <span class="availability">Volverá pronto</span>
        } @else {
          <span class="portion">{{ product().portion }}</span>
        }
      </a>
      <div class="product-info">
        <h3>
          <a [routerLink]="['/productos', product().id]">{{ product().name }}</a>
        </h3>
        <p>{{ product().description }}</p>
        <div class="product-bottom">
          <strong>{{ product().priceCents | money }}</strong>
          <button
            class="add-button"
            [disabled]="!product().available"
            (click)="cart.add(product())"
            [attr.aria-label]="'Añadir ' + product().name"
          >
            {{ product().available ? '+ Añadir' : 'Agotado' }}
          </button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCard {
  product = input.required<Product>();
  cart = inject(CartService);
}
