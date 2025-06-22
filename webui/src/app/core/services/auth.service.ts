// auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, MOCK_USERS } from '../constants/mock-users';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    const token = localStorage.getItem('token');
    const user = MOCK_USERS.find(u => u.token === token);
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  loginWithCredentials(username: string, password: string,role:string): boolean {
    const user = MOCK_USERS.find(u => u.username === username && u.password === password &&  u.role == role);
    if (user) {
      localStorage.setItem('token', user.token);
      this.currentUserSubject.next(user);
      return true;
    }
    return false;
  }

  loginAsGuest(): boolean {
    const guest = MOCK_USERS.find(u => u.role === 'guest');
    if (guest) {
      localStorage.setItem('token', guest.token);
      this.currentUserSubject.next(guest);
      return true;
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}