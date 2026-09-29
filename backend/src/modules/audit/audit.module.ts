import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
