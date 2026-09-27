import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiService, errorMessage } from './api.service';
import { Category, Product } from './models';
import { ProductCard } from './product-card';
@Component({
  selector: 'app-catalog',
  imports: [FormsModule, ProductCard],
  template: `
    <section class="page-heading">
      <p class="eyebrow">HECHOS CON CARIÑO, CADA DÍA</p>
      <h1>Un antojo bien merecido.</h1>
      <p>Elige tus favoritos. Nosotros ponemos el toque dulce.</p>
    </section>
    <section class="section catalog-section">
      <form class="search-form" (ngSubmit)="search()">
        <label class="sr-only" for="search">Buscar productos</label><span aria-hidden="true">⌕</span
        ><input
          id="search"
          name="search"
          type="search"
          maxlength="100"
          [(ngModel)]="query"
          placeholder="Busca tu próximo antojo…"
        /><button type="submit" class="button small">Buscar</button>
      </form>
      <div class="filter-bar" role="group" aria-label="Filtrar por categoría">
        <button
          [class.selected]="!category()"
          [attr.aria-pressed]="!category()"
          (click)="filter('')"
        >
          Todo el menú
        </button>
        @for (item of categories(); track item.id) {
          <button
            [class.selected]="category() === item.id"
            [attr.aria-pressed]="category() === item.id"
            (click)="filter(item.id)"
          >
            {{ item.name }}
          </button>
        }
      </div>
      @if (loading()) {
        <div class="state-box" role="status">Preparando el mostrador…</div>
      } @else if (error()) {
        <div class="state-box" role="alert">
          <h2>No pudimos cargar el menú</h2>
          <p>{{ error() }}</p>
          <button class="button" (click)="retry()">Volver a intentar</button>
        </div>
      } @else if (!products().length) {
        <div class="state-box">
          <span class="state-icon" aria-hidden="true">⌕</span>
          <h2>No encontramos ese antojo</h2>
          <p>Prueba otra búsqueda o descubre todo el menú.</p>
          <button class="button" (click)="reset()">Ver todos los productos</button>
        </div>
      } @else {
        <p class="results-count" role="status">
          {{ products().length }} productos · Un poco de felicidad para llevar
        </p>
        <div class="product-grid">
          @for (product of products(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      }
    </section>
  `,
})
export class Catalog {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private reload = new BehaviorSubject(0);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  category = signal('');
  loading = signal(true);
  error = signal('');
  query = '';
  constructor() {
    combineLatest([this.route.queryParamMap, this.reload])
      .pipe(
        tap(([params]) => {
          this.query = params.get('q') || '';
          this.category.set(params.get('categoria') || '');
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(() =>
          forkJoin({
            products: this.api.products(this.query, this.category()),
            categories: this.api.categories(),
            error: of(''),
          }).pipe(
            catchError((error) =>
              of({
                products: [] as Product[],
                categories: [] as Category[],
                error: errorMessage(error),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.products.set(result.products);
        this.categories.set(result.categories);
        this.error.set(result.error);
        this.loading.set(false);
      });
  }
  search() {
    void this.router.navigate(['/productos'], {
      queryParams: { q: this.query.trim() || null, categoria: this.category() || null },
    });
  }
  filter(category: string) {
    this.category.set(category);
    this.search();
  }
  reset() {
    this.query = '';
    this.filter('');
  }
  retry() {
    this.reload.next(this.reload.value + 1);
  }
}
