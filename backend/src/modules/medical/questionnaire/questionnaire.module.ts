import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../config/database.module';
import { AuthModule } from '../../auth/auth.module';

import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
})
export class QuestionnaireModule {}
