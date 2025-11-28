// Entity Registry - จัดการ entities สำหรับแต่ละ database
import { 
  User, 
  UserToken, 
  LoginLog, 
  FinanceRecord, 
  Patient, 
  MedicalRecord 
} from './entities';

// Type definition สำหรับ Entity Class
export type EntityClass = new (...args: any[]) => any;

// Default entities สำหรับ default database
export const DEFAULT_ENTITIES: EntityClass[] = [
  User,
  UserToken,
  LoginLog,
  FinanceRecord,
  Patient,
  MedicalRecord,
];

// Entity configurations สำหรับแต่ละ database
export const DATABASE_ENTITIES: Record<string, EntityClass[]> = {
  default: DEFAULT_ENTITIES,
  db1: [User, UserToken, LoginLog],
  db2: [Patient, MedicalRecord],
  finance_db: [User, FinanceRecord],
  api_db: [User],
};

// Helper functions
export const getEntitiesForDatabase = (dbName: string = 'default'): EntityClass[] => {
  return DATABASE_ENTITIES[dbName] || DEFAULT_ENTITIES;
};

// Main export for TypeORM
export const getEntitiesForTypeOrm = (dbName: string = 'default') => {
  return getEntitiesForDatabase(dbName);
};
