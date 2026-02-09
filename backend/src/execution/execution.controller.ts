import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { ExecutionService, ExecutionResult } from './execution.service';
import { ExecuteRulesDto } from './dto/execute.dto';

@Controller('execute')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) { }

    @Post()
    async execute(@Body() dto: ExecuteRulesDto): Promise<ExecutionResult> {
        try {
            return await this.executionService.execute(
                dto.domainId,
                dto.data,
                dto.ruleIds,
                dto.environment ?? 'production',
            );
        } catch (error: any) {
            if (error.message?.includes('not found')) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}
