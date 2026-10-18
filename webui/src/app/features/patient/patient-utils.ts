// ตัวช่วยแสดงผลข้อมูลคนไข้ — ใช้ร่วมกันระหว่างหน้ารายชื่อและหน้าข้อมูลคนไข้
import { Patient } from '../../models/users/user.model';

export function patientName(p: Pick<Patient, 'first_name' | 'last_name'>): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
}

// อักษรแรกของชื่อ + นามสกุล (ข้ามสระนำ เ แ โ ใ ไ ให้ได้พยัญชนะ)
export function patientInitials(p: Pick<Patient, 'first_name' | 'last_name'>): string {
  const first = (w?: string) => (w?.match(/[^เ-ไ\s]/)?.[0] ?? '').toUpperCase();
  return first(p.first_name) + first(p.last_name) || '?';
}

export function patientGender(g?: string): { key: 'male' | 'female' | 'other' | ''; label: string } {
  if (g === 'male' || g === 'M') return { key: 'male', label: 'ชาย' };
  if (g === 'female' || g === 'F') return { key: 'female', label: 'หญิง' };
  if (g) return { key: 'other', label: 'อื่นๆ' };
  return { key: '', label: '—' };
}

export function patientAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const hadBirthday = today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthday) years--;
  return years;
}

// 0812345678 → 081-234-5678
export function formatPhone(phone?: string): string {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return phone;
}

// ----- เลขบัตรประชาชน -----

export function onlyDigits(v?: string | null): string {
  return (v ?? '').replace(/\D/g, '');
}

// หลักที่ 13 = (11 - (ผลรวม หลักที่ i × (14 - i), i = 1..12) mod 11) mod 10 — ตรงกับที่ backend เช็ก
export function isValidThaiId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

// 1234567890123 → 1-2345-67890-12-3
export function formatThaiId(id?: string | null): string {
  const d = onlyDigits(id);
  if (d.length !== 13) return id || '—';
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

// ซ่อนกลางเลข (ข้อมูลส่วนบุคคล): 1-xxxx-xxxxx-12-3
export function maskThaiId(id?: string | null): string {
  const d = onlyDigits(id);
  if (d.length !== 13) return id || '—';
  return `${d[0]}-xxxx-xxxxx-${d.slice(10, 12)}-${d[12]}`;
}
