import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getEntitiesForTypeOrm } from './entity-registry';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(getEntitiesForTypeOrm('default')) // ใช้ default entities
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}