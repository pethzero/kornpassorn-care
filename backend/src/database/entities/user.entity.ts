import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'username', type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  password_hash: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email?: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  first_name?: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  last_name?: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phone_number?: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'role', type: 'varchar', default: 'user' })
  role: string;
}
