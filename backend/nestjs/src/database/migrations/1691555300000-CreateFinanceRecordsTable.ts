import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateFinanceRecordsTable1691555300000 implements MigrationInterface {
  name = 'CreateFinanceRecordsTable1691555300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'finance_records',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'item_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'record_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // เพิ่ม check constraint สำหรับ category
    await queryRunner.query(
      `ALTER TABLE finance_records ADD CONSTRAINT "CHK_finance_records_category" CHECK (category IN ('income','expense'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('finance_records');
  }
}
