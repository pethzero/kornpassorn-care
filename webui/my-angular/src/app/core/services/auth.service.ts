import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  userId: number;
  username: string;
  name?: string;   // เพิ่ม optional name
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private csrfToken: string = '';
  private logoutTimer: any;

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
  const expiresAt = Number(localStorage.getItem('expires_at'));

    // if (token && expiresAt && Date.now() < expiresAt) {
  if (token) { 
      try {
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
      } catch (e) {
        this.clearAuthState();
      }
    } else {
      this.clearAuthState();
    }

  }

  // ================== CSRF ==================
  fetchCsrfToken() {
    return this.http.get<{ csrfToken: string }>(
      `${environment.apiUrl}/auth/csrf-token`,
      { withCredentials: true }
    ).pipe(
      tap(res => this.csrfToken = res.csrfToken)
    );
  }

  getCsrfToken(): string {
    return this.csrfToken;
  }

  // ================== JWT Decode ==================
  private decodeToken(token: string): User {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,  // map name ถ้ามีใน payload
      role: payload.role
    };
  }

  // ================== LOGIN ==================
  loginWithCredentials(username: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string, expires_in?: number }>(
      `${environment.apiUrl}/auth/login`,
      { username, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          this.setAuthState(response.access_token, response.expires_in);
        }
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  loginAsGuest(): Observable<boolean> {
    return this.http.post<{ access_token: string; expires_in?: number; expired_at?: string }>(
      `${environment.apiUrl}/auth/guest`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          this.setAuthState(response.access_token, response.expires_in);
        }
      }),
      map(() => true),
      catchError(err => {
        this.clearAuthState();
        return of(false);
      })
    );
  }

  logout(callback?: () => void): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.clearAuthState();
          if (callback) callback();
        },
        error: () => {
          this.clearAuthState();
          if (callback) callback();
        }
      });
  }

  // ================== State Helpers ==================
  private setAuthState(token: string, expiresIn?: number) {
    localStorage.setItem('token', token);
    const user = this.decodeToken(token);
    this.currentUserSubject.next(user);

    if (expiresIn) {
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem('expires_at', expiresAt.toString());
      this.setLogoutTimer(expiresIn * 1000);
    }
  }

  private clearAuthState(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('expires_at');
    this.currentUserSubject.next(null);
    console.log('www')
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }
  private setLogoutTimer(duration: number) {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    this.logoutTimer = setTimeout(() => this.logout(), duration);
  }

  // ================== Getters ==================
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('expires_at');
    return !!token && !!expiresAt && Date.now() < +expiresAt;
  }
}
