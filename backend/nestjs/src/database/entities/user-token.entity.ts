import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @Index()
  user: User;

  @Column({ name: 'token_hash', nullable: true })
  @Index()
  tokenHash?: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  jti?: string;

  @Column({ name: 'token_type', default: 'access' })
  tokenType?: string;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo?: any;

  @Column({ name: 'device_ip', type: 'inet', nullable: true })
  deviceIp?: string;


  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy?: string;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ name: 'expired_at', type: 'timestamp', nullable: true })
  expired_at?: Date;

  @Column({ name: 'last_used', type: 'timestamp', nullable: true })
  last_used?: Date;

  @Column({ name: 'is_permanent', default: false })
  is_permanent?: boolean;

  @Column({ default: false })
  @Index()
  revoked: boolean;
}