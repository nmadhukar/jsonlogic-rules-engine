import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { DomainsModule } from './domains/domains.module';
import { RulesModule } from './rules/rules.module';
import { ExecutionModule } from './execution/execution.module';
import { AuditModule } from './audit/audit.module';
import { TestingModule } from './testing/testing.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,      // Global — audit trail for all services
    WebhooksModule,   // Global — webhook events for all services
    DomainsModule,
    RulesModule,
    ExecutionModule,
    TestingModule,
    AuthModule,
    AnalysisModule,
  ],
})
export class AppModule { }
