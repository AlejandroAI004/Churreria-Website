import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';
import { errorMessage } from './api.service';
@Component({
  selector: 'app-account',
  imports: [FormsModule],
  template: ` <section class="account-wrap">
    <div class="account-intro">
      <p class="eyebrow">QUÉ BUENO VERTE</p>
      <h1>Un rincón<br />para ti.</h1>
      <p>
        Una cuenta local para probar el inicio de sesión. Puedes explorar, llenar tu carrito y
        confirmar un pedido de demostración sin registrarte.
      </p>
      <img src="/art/bebida.svg" alt="" width="480" height="340" />
    </div>
    <div class="account-panel">
      @if (auth.user(); as user) {
        <p class="eyebrow">BIENVENIDO A CASA</p>
        <h2>Tu perfil local</h2>
        <p>{{ user.email }}</p>
        <p>
          Has iniciado sesión. Esta consulta del perfil es la única función que requiere
          autenticación.
        </p>
        <button class="button" [disabled]="busy()" (click)="profile()">
          Consultar perfil protegido</button
        ><button class="text-button logout" (click)="logout()">Cerrar sesión</button>
      } @else {
        <div class="account-tabs" role="group" aria-label="Acceso a la cuenta">
          <button
            [class.selected]="mode() === 'login'"
            [attr.aria-pressed]="mode() === 'login'"
            (click)="switchMode('login')"
          >
            Iniciar sesión</button
          ><button
            [class.selected]="mode() === 'register'"
            [attr.aria-pressed]="mode() === 'register'"
            (click)="switchMode('register')"
          >
            Crear cuenta
          </button>
        </div>
        <h2>{{ mode() === 'login' ? 'Pasa, estás en tu casa.' : 'Un placer conocerte.' }}</h2>
        <form (ngSubmit)="submit()" #form="ngForm">
          <label for="email">Correo electrónico</label
          ><input
            id="email"
            name="email"
            type="email"
            required
            email
            maxlength="254"
            autocomplete="email"
            [(ngModel)]="email"
          />
          <label for="password">Contraseña</label
          ><input
            id="password"
            name="password"
            type="password"
            required
            minlength="10"
            maxlength="128"
            [autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'"
            aria-describedby="password-help"
            [(ngModel)]="password"
          />
          <small id="password-help">Entre 10 y 128 caracteres.</small
          ><button class="button" type="submit" [disabled]="busy() || form.invalid">
            {{ busy() ? 'Un momento…' : mode() === 'login' ? 'Entrar' : 'Crear mi cuenta' }}
          </button>
        </form>
        <p class="muted">
          La sesión dura hasta que recargues o cierres esta página, con un máximo de una hora. Solo
          el perfil requiere iniciar sesión.
        </p>
      }
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="success-message" role="status">{{ message() }}</p>
      }
    </div>
  </section>`,
})
export class Account {
  auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  mode = signal<'login' | 'register'>('login');
  email = '';
  password = '';
  busy = signal(false);
  error = signal('');
  message = signal('');
  switchMode(mode: 'login' | 'register') {
    this.mode.set(mode);
    this.password = '';
    this.error.set('');
    this.message.set('');
  }
  submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.auth
      .authenticate(this.mode(), this.email, this.password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.password = '';
          this.busy.set(false);
          this.message.set('Sesión iniciada correctamente.');
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
        },
      });
  }
  profile() {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.auth
      .profile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.message.set('Perfil consultado con una sesión válida.');
          this.busy.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.busy.set(false);
          this.auth.logout();
        },
      });
  }
  logout() {
    this.auth.logout();
    this.message.set('Has cerrado sesión.');
    this.error.set('');
  }
}
