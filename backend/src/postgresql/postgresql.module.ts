import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PostgresqlService } from  './postgresql.service';
import { PostgresqlController } from './postgresql.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PostgresqlService],
  controllers: [PostgresqlController],
  exports: [PostgresqlService],
})
export class PostgresqlModule {}