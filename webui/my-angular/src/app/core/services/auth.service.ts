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
private logoutTimer: any;
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


  // loginWithCredentials(username: string, password: string): Observable<boolean> {
  //   return this.http.post<{ access_token: string }>(
  //     `${environment.apiUrl}/auth/login`,
  //     { username, password },
  //     { withCredentials: true }
  //   ).pipe(
  //     tap(response => {
  //       // ถ้าต้องการเก็บ access_token ใน localStorage (ถ้า backend ส่งกลับมา)
  //       if (response.access_token) {
  //         localStorage.setItem('token', response.access_token);
  //         const user = this.decodeToken(response.access_token);
  //         this.currentUserSubject.next(user);
  //       }
  //     }),
  //     map(() => true),
  //     catchError(() => of(false))
  //   );
  // }


  // loginAsGuest(): Observable<boolean> {
  //   return this.http.post<{ access_token: string }>(
  //     `${environment.apiUrl}/auth/guest`,
  //     {}
  //   ).pipe(
  //     tap(response => {
  //       const token = response.access_token;
  //       localStorage.setItem('token', token);
  //       const user = this.decodeToken(token);
  //       this.currentUserSubject.next(user);
  //     }),
  //     map(() => true),
  //     catchError(err => {
  //       console.error('Guest login failed', err);
  //       this.logout();
  //       return of(false);
  //     })
  //   );
  // }

  // logout(): void {
  //   localStorage.removeItem('token');
  //   this.currentUserSubject.next(null);
  // }


  /////////////////////
    loginWithCredentials(username: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string, expires_in?: number }>(
      `${environment.apiUrl}/auth/login`,
      { username, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          const user = this.decodeToken(response.access_token);
          this.currentUserSubject.next(user);

          // ตั้งเวลา logout auto ถ้ามี expires_in
          if (response.expires_in) {
            const expiresAt = Date.now() + response.expires_in * 1000;
            localStorage.setItem('expires_at', expiresAt.toString());
            this.setLogoutTimer(response.expires_in * 1000);
          }
        }
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  loginAsGuest(): Observable<boolean> {
    return this.http.post<{ access_token: string, expires_in?: number }>(
      `${environment.apiUrl}/auth/guest`,
      {}
    ).pipe(
      tap(response => {
        const token = response.access_token;
        localStorage.setItem('token', token);
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);

        if (response.expires_in) {
          const expiresAt = Date.now() + response.expires_in * 1000;
          localStorage.setItem('expires_at', expiresAt.toString());
          this.setLogoutTimer(response.expires_in * 1000);
        }
      }),
      map(() => true),
      catchError(err => {
        console.error('Guest login failed', err);
        this.logout();
        return of(false);
      })
    );
  }

  private setLogoutTimer(duration: number) {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    this.logoutTimer = setTimeout(() => {
      this.logout();
      // คุณอาจ redirect ไปหน้า login ที่นี่
    }, duration);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('expires_at');
    this.currentUserSubject.next(null);
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}


