import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
    constructor(private readonly analysisService: AnalysisService) { }

    @Get('conflicts/:domainId')
    async analyzeConflicts(@Param('domainId') domainId: string) {
        try {
            return await this.analysisService.analyzeConflicts(domainId);
        } catch (error: any) {
            if (error.message?.includes('not found')) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}
