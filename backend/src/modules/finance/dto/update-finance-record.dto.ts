import { PartialType } from '@nestjs/mapped-types';
import { CreateFinanceRecordDto } from './create-finance-record.dto';

export class UpdateFinanceRecordDto extends PartialType(CreateFinanceRecordDto) {}
