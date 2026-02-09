import { Test, TestingModule } from '@nestjs/testing';
import { TestingController } from './testing.controller';
import { TestingService } from './testing.service';
import { NotFoundException } from '@nestjs/common';

describe('TestingController', () => {
    let controller: TestingController;
    let service: any;

    const mockSuite = { id: 's1', name: 'Suite', domainId: 'd1', cases: [] };
    const mockRunResult = { suiteId: 's1', suiteName: 'Suite', totalCases: 1, passed: 1, failed: 0 };

    beforeEach(async () => {
        service = {
            findAllSuites: jest.fn().mockResolvedValue([mockSuite]),
            findSuite: jest.fn().mockResolvedValue(mockSuite),
            createSuite: jest.fn().mockResolvedValue(mockSuite),
            deleteSuite: jest.fn().mockResolvedValue(mockSuite),
            addCase: jest.fn().mockResolvedValue({ id: 'c1', name: 'Case' }),
            deleteCase: jest.fn().mockResolvedValue({ id: 'c1' }),
            runSuite: jest.fn().mockResolvedValue(mockRunResult),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TestingController],
            providers: [{ provide: TestingService, useValue: service }],
        }).compile();
        controller = module.get<TestingController>(TestingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('should list suites', async () => expect(await controller.findAll()).toHaveLength(1));
    it('should filter suites by domainId', async () => {
        await controller.findAll('d1');
        expect(service.findAllSuites).toHaveBeenCalledWith('d1');
    });
    it('should find one suite', async () => expect((await controller.findOne('s1')).name).toBe('Suite'));
    it('should throw 404 for missing suite', async () => {
        service.findSuite.mockResolvedValue(null);
        await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });
    it('should create a suite', async () => {
        await controller.create({ name: 'New', domainId: 'd1' });
        expect(service.createSuite).toHaveBeenCalled();
    });
    it('should delete a suite', async () => {
        const result = await controller.delete('s1');
        expect(result).toEqual({ deleted: true, id: 's1' });
    });
    it('should add a test case', async () => {
        await controller.addCase('s1', { name: 'TC', inputData: {}, expectedResult: {} });
        expect(service.addCase).toHaveBeenCalledWith('s1', expect.any(Object));
    });
    it('should delete a test case', async () => {
        const result = await controller.deleteCase('c1');
        expect(result).toEqual({ deleted: true, id: 'c1' });
    });
    it('should run a suite', async () => {
        const result = await controller.runSuite('s1');
        expect(result.passed).toBe(1);
    });
});
