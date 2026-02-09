import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';

@Module({
    controllers: [ExecutionController],
    providers: [ExecutionService],
    exports: [ExecutionService], // Exported for TestSuites to reuse
})
export class ExecutionModule { }
