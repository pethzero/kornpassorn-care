// import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { Patient } from './patient.entity';

// @Entity({ name: 'medical_records' })
// export class MedicalRecord {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   patient_id: number;

//   @ManyToOne(() => Patient, (patient) => patient.medical_records, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'patient_id' })
//   patient: Patient;

//   @Column({ type: 'timestamp' })
//   visit_date: Date;

//   @Column({ type: 'text', nullable: true })
//   symptoms: string;

//   @Column({ type: 'text', nullable: true })
//   diagnosis: string;

//   @Column({ type: 'text', nullable: true })
//   treatment: string;

//   @Column({ length: 100, nullable: true })
//   doctor_name: string;

//   @Column({ type: 'text', nullable: true })
//   note: string;

//   @Column({ type: 'timestamp', default: () => 'now()' })
//   created_at: Date;
// }