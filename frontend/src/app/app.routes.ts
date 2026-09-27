import { Routes } from '@angular/router';
import { Home } from './home';
export const routes: Routes = [
  { path: '', component: Home, title: 'La Churrería · Hechos para compartir' },
  {
    path: 'productos',
    loadComponent: () => import('./catalog').then((m) => m.Catalog),
    title: 'Nuestro menú · La Churrería',
  },
  {
    path: 'productos/:id',
    loadComponent: () => import('./detail').then((m) => m.Detail),
    title: 'Un antojo · La Churrería',
  },
  {
    path: 'carrito',
    loadComponent: () => import('./cart-page').then((m) => m.CartPage),
    title: 'Tu carrito · La Churrería',
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./account').then((m) => m.Account),
    title: 'Tu cuenta · La Churrería',
  },
  { path: '**', redirectTo: '' },
];
