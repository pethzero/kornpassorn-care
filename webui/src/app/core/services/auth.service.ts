

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


  private decodeToken(token: string): User {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role
    };
  }

  loginWithCredentials(username: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string }>(
      `${environment.apiUrl}/auth/login`,
      { username, password }
    ).pipe(
      tap(response => {
        const token = response.access_token;
        localStorage.setItem('token', token);
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
      }),
      map(() => true),
      catchError(err => {
        this.logout();
        return of(false);
      })
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



// // auth.service.ts
// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable, of } from 'rxjs';
// import { User, MOCK_USERS } from '../constants/mock-users';

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private currentUserSubject = new BehaviorSubject<User | null>(null);
//   currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

//   constructor() {
//     const token = localStorage.getItem('token');
//     const user = MOCK_USERS.find(u => u.token === token);
//     if (user) {
//       this.currentUserSubject.next(user);
//     }
//   }

//   loginWithCredentials(username: string, password: string,role:string): boolean {
//     const user = MOCK_USERS.find(u => u.username === username && u.password === password &&  u.role == role);
//     if (user) {
//       localStorage.setItem('token', user.token);
//       this.currentUserSubject.next(user);
//       return true;
//     }
//     return false;
//   }

//   loginAsGuest(): boolean {
//     const guest = MOCK_USERS.find(u => u.role === 'guest');
//     if (guest) {
//       localStorage.setItem('token', guest.token);
//       this.currentUserSubject.next(guest);
//       return true;
//     }
//     return false;
//   }

//   logout(): void {
//     localStorage.removeItem('token');
//     this.currentUserSubject.next(null);
//   }

//   getCurrentUser(): User | null {
//     console.log( this.currentUserSubject.value)
//     return this.currentUserSubject.value;
//   }
// }


// // import { Injectable } from '@angular/core';
// // import { HttpClient } from '@angular/common/http';
// // import { BehaviorSubject, Observable } from 'rxjs';

// // interface User {
// //   id: string;
// //   username: string;
// //   role: string;
// //   // ...อื่น ๆ ตาม backend ส่งมา
// // }

// // @Injectable({ providedIn: 'root' })
// // export class AuthService {
// //   private currentUserSubject = new BehaviorSubject<User | null>(null);
// //   currentUser$ = this.currentUserSubject.asObservable();

// //   constructor(private http: HttpClient) {
// //     this.initUser(); // ตอน service ถูกโหลด
// //   }

// //   // 🟢 เรียกเมื่อ login สำเร็จ
// //   login(username: string, password: string): Observable<boolean> {
// //     return new Observable(observer => {
// //       this.http.post<{ token: string }>('/api/login', { username, password }).subscribe({
// //         next: res => {
// //           localStorage.setItem('token', res.token);

// //           // 👇 Decode token แล้ว set current user จาก payload
// //           const payload = JSON.parse(atob(res.token.split('.')[1]));
// //           const user: User = {
// //             id: payload.sub,
// //             username: payload.username,
// //             role: payload.role
// //           };
// //           this.currentUserSubject.next(user);

// //           observer.next(true);
// //           observer.complete();
// //         },
// //         error: err => {
// //           observer.next(false);
// //           observer.complete();
// //         }
// //       });
// //     });
// //   }

// //   // 🟡 สำหรับ refresh state ตอน reload หน้า
// //   initUser(): void {
// //     const token = localStorage.getItem('token');
// //     if (!token) return;

// //     // 1) Decode JWT จาก token
// //     try {
// //       const payload = JSON.parse(atob(token.split('.')[1]));
// //       const user: User = {
// //         id: payload.sub,
// //         username: payload.username,
// //         role: payload.role
// //       };
// //       this.currentUserSubject.next(user);
// //     } catch (e) {
// //       this.logout(); // token พัง → logout ไปเลย
// //     }

// //     // หรือ 2) ใช้ API ดึงข้อมูลสดก็ได้
// //     // this.http.get<User>('/api/me').subscribe({
// //     //   next: user => this.currentUserSubject.next(user),
// //     //   error: _ => this.logout()
// //     // });
// //   }

// //   logout(): void {
// //     localStorage.removeItem('token');
// //     this.currentUserSubject.next(null);
// //   }

// //   getCurrentUser(): User | null {
// //     return this.currentUserSubject.value;
// //   }
// // }
