import { Injectable, signal, inject } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private token = '';
  readonly user = signal<User | null>(null);
  authenticate(mode: 'login' | 'register', email: string, password: string) {
    return this.api.authenticate(mode, email, password).pipe(
      tap((session) => {
        this.token = session.token;
        this.user.set(session.user);
      }),
    );
  }
  profile() {
    return this.api.profile(this.token).pipe(tap((user) => this.user.set(user)));
  }
  logout() {
    this.token = '';
    this.user.set(null);
  }
}
