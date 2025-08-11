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

export const getEntityPathsForDatabase = (dbName: string = 'default'): string[] => {
  // แค่ return pattern ทั่วไป เพราะ TypeORM สามารถ auto-discover entities ได้
  return ['src/database/entities/*.entity.ts'];
};

export const hasEntityInDatabase = (dbName: string, entityClass: EntityClass): boolean => {
  return getEntitiesForDatabase(dbName).includes(entityClass);
};

// Utility functions
export const addEntityToDatabase = (dbName: string, entityClass: EntityClass): void => {
  DATABASE_ENTITIES[dbName] = DATABASE_ENTITIES[dbName] || [];
  if (!DATABASE_ENTITIES[dbName].includes(entityClass)) {
    DATABASE_ENTITIES[dbName].push(entityClass);
  }
};

export const removeEntityFromDatabase = (dbName: string, entityClass: EntityClass): void => {
  if (DATABASE_ENTITIES[dbName]) {
    DATABASE_ENTITIES[dbName] = DATABASE_ENTITIES[dbName].filter(entity => entity !== entityClass);
  }
};

export const listEntitiesInDatabase = (dbName: string = 'default'): string[] => {
  return getEntitiesForDatabase(dbName).map(entity => entity.name);
};

// Main export for TypeORM
export const getEntitiesForTypeOrm = (dbName: string = 'default') => {
  return getEntitiesForDatabase(dbName);
};
