import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError, map, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  userId: number;
  username: string;
  name?: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private csrfToken: string = '';

  // refresh token หมุน jti ใหม่ทุกครั้งที่เรียก (revoke ตัวเก่าทิ้ง) ถ้ามีหลาย call พร้อมกัน
  // (เช่น AuthGuard ติดทั้ง parent + child route ของ navigation เดียวกัน) แล้วยิง /auth/refresh ซ้ำ
  // อันที่ถึง backend ทีหลังจะเจอ jti ที่โดน revoke ไปแล้วจาก call แรก -> 401 ทั้งที่ session จริงยัง valid
  // เก็บ observable ที่กำลังทำงานอยู่ไว้ ให้ผู้เรียกพร้อมกันแชร์ request เดียวกันแทนที่จะยิงซ้ำ
  private refreshInFlight$: Observable<string> | null = null;

  constructor(private http: HttpClient) {
    // hydrate แบบ sync จาก localStorage ก่อน (decode อย่างเดียว ไม่ยิง http)
    // ป้องกัน race condition ที่ guard/LoginRedirectGuard เช็ค getCurrentUser() ก่อน /auth/me จะตอบกลับ
    // แล้วเข้าใจผิดว่ายังไม่ login ทั้งที่ token ที่ remember ไว้ยัง valid อยู่
    this.hydrateFromStorage();

    // ต้อง defer ออกไปนอก constructor ก่อน เพราะถ้ายิง http.get() sync ตรงนี้เลย
    // จะไป trigger authInterceptor ที่ inject(AuthService) ซ้ำ ขณะที่ instance นี้ยังสร้างไม่เสร็จ
    // -> Angular throw NG0200 circular dependency (error ถูกกลืนเงียบๆ ใน loadUser() ทำให้ /auth/me ไม่เคยยิงจริง)
    queueMicrotask(() => this.initUserFromServer());
  }

  private hydrateFromStorage() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const expMs = this.getTokenExpMs(token);
    if (expMs && Date.now() >= expMs) {
      // access token หมดอายุแล้ว ปล่อยให้ตอนยิง request จริงแล้วโดน 401 -> interceptor ไปต่ออายุผ่าน refresh cookie เอง
      return;
    }

    try {
      this.currentUserSubject.next(this.decodeToken(token));
    } catch {
      this.clearAuthState();
    }
  }

  // ================== INIT ==================
  private initUserFromServer() {
    // ไม่มี token เก็บไว้เลย ก็ไม่ต้องยิงเช็ค (ยังไม่เคย login)
    if (!localStorage.getItem('token')) {
      return;
    }
    this.loadUser();
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
  // JWT ใช้ base64url (-, _, ไม่มี padding) ไม่ใช่ base64 มาตรฐาน — atob() ตรงๆ จะ throw
  // ทันทีที่เจอ '-' หรือ '_' ในตัว payload (เกิดขึ้นได้จริงแม้จะไม่บ่อยกับ payload สั้นๆ แบบนี้)
  // เลย normalize เป็น base64 มาตรฐานก่อนเสมอ และรวม decode ไว้จุดเดียวไม่ให้ 2 เมธอดแยกกัน parse เอง
  private parseTokenPayload(token: string): any {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    return JSON.parse(atob(padded));
  }

  private decodeToken(token: string): User {
    const payload = this.parseTokenPayload(token);
    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role
    };
  }

  // คืนค่า exp (ms) ของ JWT จาก payload จริง แทนที่จะพึ่ง localStorage key แยกที่ไม่เคยถูกเซ็ต
  private getTokenExpMs(token: string): number | null {
    try {
      const payload = this.parseTokenPayload(token);
      return payload?.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // ================== LOGIN ==================
  loginWithCredentials(username: string, password: string, rememberMe = false): Observable<boolean> {
    return this.http.post<{ access_token?: string }>(
      `${environment.apiUrl}/auth/login`,
      { username, password, rememberMe },
      { withCredentials: true }
    ).pipe(
      tap(res => {
        // decodeToken จาก JWT ที่เพิ่งได้มาพอแล้ว ไม่ต้องยิง /auth/me ซ้ำ
        // (ถ้ายิงซ้ำแล้วบังเอิญ fail จะไปล้าง token ที่เพิ่ง login สำเร็จทิ้งโดยไม่ตั้งใจ)
        if (res?.access_token) {
          this.setAccessToken(res.access_token);
        }
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  loginAsGuest(): Observable<boolean> {
    return this.http.post<{ access_token?: string }>(
      `${environment.apiUrl}/auth/guest`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res?.access_token) {
          this.setAccessToken(res.access_token);
        }
      }),
      map(() => true),
      catchError(() => {
        this.clearAuthState();
        return of(false);
      })
    );
  }

  // ================== REFRESH ==================
  refreshToken(): Observable<string> {
    // มี request กำลังทำงานอยู่แล้ว -> แชร์ผลลัพธ์เดียวกัน ไม่ยิง /auth/refresh ซ้ำ (ดู comment ที่ refreshInFlight$)
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http.post<{ access_token: string }>(
      `${environment.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      map(res => res.access_token),
      tap(token => this.setAccessToken(token)),
      finalize(() => { this.refreshInFlight$ = null; }),
      shareReplay(1)
    );

    return this.refreshInFlight$;
  }

  // ================== LOGOUT ==================
  logout(callback?: () => void): void {
    // ไม่มี token อยู่แล้ว = logout ไปแล้ว/ยังไม่เคย login ไม่ต้องยิง /auth/logout ซ้ำ
    // (guard + interceptor อาจเห็น refresh พัง 401 พร้อมกันแล้วเรียก logout() ซ้อนกันได้ตอนนี้
    // เพราะ refreshToken() แชร์ error เดียวกันให้ทุกคนที่รออยู่)
    if (!localStorage.getItem('token')) {
      this.clearAuthState();
      callback?.();
      return;
    }

    this.clearAuthState();
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
      withCredentials: true
    }).subscribe({
      next: () => callback?.(),
      error: () => callback?.()
    });
  }

  // ================== HELPERS ==================
  private async loadUser() {
    try {
      const me = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/auth/me`, {
          withCredentials: true
        })
      );

      if (me?.user) {
        const u: User = {
          userId: me.user.id,
          username: me.user.username,
          name: me.user.name,
          role: me.user.role
        };
        this.currentUserSubject.next(u);
      }
    } catch (err) {
      // ล้าง session เฉพาะตอนที่ backend ยืนยันว่า unauthenticated จริง (401)
      // error อื่น (network/CORS ชั่วคราว ฯลฯ) ไม่ควรทำให้ต้อง login ใหม่ทั้งที่ token ยังใช้ได้
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.clearAuthState();
      }
    }
  }

  private setAccessToken(token: string) {
    localStorage.setItem('token', token);

    const expMs = this.getTokenExpMs(token);
    if (expMs) {
      localStorage.setItem('expires_at', String(expMs));
    } else {
      localStorage.removeItem('expires_at');
    }

    try {
      const user = this.decodeToken(token);
      this.currentUserSubject.next(user);
    } catch {
      this.currentUserSubject.next(null);
    }
  }

  private clearAuthState() {
    localStorage.removeItem('token');
    localStorage.removeItem('expires_at');
    this.currentUserSubject.next(null);
  }

  // ================== GETTERS ==================
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    // 🔥 เช็คจาก state ไม่ใช่เวลา
    return !!this.currentUserSubject.value;
  }
}