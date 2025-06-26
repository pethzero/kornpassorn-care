

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  userId: number;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private csrfToken: string = '';

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Invalid token in localStorage, clearing it.', error);
        this.logout(); // ล้าง token ที่ไม่ถูกต้องออก
      }
    }
  }

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
  private decodeToken(token: string): User {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role
    };
  }


  loginWithCredentials(username: string, password: string): Observable<boolean> {
    return this.http.post<{ csrfToken: string }>(
      `${environment.apiUrl}/auth/login`,
      { username, password },
      { withCredentials: true } // ✅ สำคัญมาก ต้องเปิดเพื่อรับ cookie
    ).pipe(
      tap(response => {
        this.csrfToken = response.csrfToken;
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }


  loginAsGuest(): Observable<boolean> {
    return this.http.post<{ access_token: string }>(
      `${environment.apiUrl}/auth/guest`,
      {}
    ).pipe(
      tap(response => {
        const token = response.access_token;
        localStorage.setItem('token', token);
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
      }),
      map(() => true),
      catchError(err => {
        console.error('Guest login failed', err);
        this.logout();
        return of(false);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}


