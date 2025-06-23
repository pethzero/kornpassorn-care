// mock-users.ts

export interface User {
  id: string;
  name: string;
  role: 'guest' | 'user' | 'admin';
  token: string;
}

// ตัวอย่าง mock user
export interface MockUser extends User {
  username: string;
  password: string;
  token: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    name: 'Guest User',
    username: 'guest',
    password: '',
    role: 'guest',
    token: 'guest-token',
  },
  {
    id: '2',
    name: 'Normal User',
    username: 'user1',
    password: 'user123',
    role: 'user',
    token: 'user-token',
  },
  {
    id: '3',
    name: 'Pethzero Admin',
    username: 'pethzero',
    password: '123456',
    role: 'admin',
    token: 'user-token',
  },
  {
    id: '4',
    name: 'Admin User',
    username: 'admin1',
    password: 'admin123',
    role: 'admin',
    token: 'admin-token',
  },
];

export enum Role {
  Admin = 'admin',
  Doctor = 'doctor',
  Nurse = 'nurse',
}