// Central export for all entities
export { User } from './user.entity';
export { UserToken } from './user-token.entity';
export { LoginLog } from './login-log.entity';
export { FinanceRecord } from './finance-record.entity';
export { Patient, MedicalRecord } from './medical.entity';
// export { ApiKey } from './api-key.entity'; // ไฟล์ว่างเปล่า

// Entity collections for easy importing
export const ALL_ENTITIES = [
  'User',
  'UserToken', 
  'LoginLog',
  'FinanceRecord',
  'Patient',
  'MedicalRecord',
  // 'ApiKey', // ไฟล์ว่างเปล่า
] as const;

export type EntityName = typeof ALL_ENTITIES[number];
