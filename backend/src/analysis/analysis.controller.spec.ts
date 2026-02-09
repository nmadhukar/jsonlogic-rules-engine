import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { NotFoundException } from '@nestjs/common';

describe('AnalysisController', () => {
    let controller: AnalysisController;
    let service: any;

    beforeEach(async () => {
        service = {
            analyzeConflicts: jest.fn().mockResolvedValue({
                domainId: 'd1', domainName: 'Test', totalRules: 2, conflicts: [], warnings: [], analyzedAt: new Date().toISOString(),
            }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalysisController],
            providers: [{ provide: AnalysisService, useValue: service }],
        }).compile();
        controller = module.get<AnalysisController>(AnalysisController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should return conflict report', async () => {
        const result = await controller.analyzeConflicts('d1');
        expect(result.domainName).toBe('Test');
    });

    it('should throw 404 for missing domain', async () => {
        service.analyzeConflicts.mockRejectedValue(new Error('Domain "x" not found'));
        await expect(controller.analyzeConflicts('x')).rejects.toThrow(NotFoundException);
    });
});
