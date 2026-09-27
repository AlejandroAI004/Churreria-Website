import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { STORE } from './store.config';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  cart = inject(CartService);
  auth = inject(AuthService);
  store = STORE;
  menuOpen = signal(false);
}
