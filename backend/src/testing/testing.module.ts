import { Module } from '@nestjs/common';
import { TestingService } from './testing.service';
import { TestingController } from './testing.controller';
import { ExecutionModule } from '../execution/execution.module';

@Module({
    imports: [ExecutionModule],
    controllers: [TestingController],
    providers: [TestingService],
})
export class TestingModule { }
