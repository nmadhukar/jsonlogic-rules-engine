import { Test, TestingModule } from '@nestjs/testing';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { NotFoundException } from '@nestjs/common';

describe('DomainsController', () => {
    let controller: DomainsController;
    let service: any;

    const mockDomain = { id: 'd1', name: 'Test', description: 'Desc' };

    beforeEach(async () => {
        service = {
            findAll: jest.fn().mockResolvedValue([mockDomain]),
            findOne: jest.fn().mockResolvedValue(mockDomain),
            create: jest.fn().mockResolvedValue(mockDomain),
            update: jest.fn().mockResolvedValue(mockDomain),
            delete: jest.fn().mockResolvedValue(mockDomain),
            exportDomain: jest.fn().mockResolvedValue({ domain: mockDomain, rules: [] }),
            importDomain: jest.fn().mockResolvedValue(mockDomain),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DomainsController],
            providers: [{ provide: DomainsService, useValue: service }],
        }).compile();
        controller = module.get<DomainsController>(DomainsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should find all domains', async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
    });

    it('should find one domain', async () => {
        const result = await controller.findOne('d1');
        expect(result.name).toBe('Test');
    });

    it('should throw 404 for missing domain', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });

    it('should create a domain', async () => {
        await controller.create({ name: 'New', fields: [], templates: [], presets: [] });
        expect(service.create).toHaveBeenCalled();
    });

    it('should update a domain', async () => {
        await controller.update('d1', { description: 'Updated' });
        expect(service.update).toHaveBeenCalledWith('d1', { description: 'Updated' });
    });

    it('should throw 404 on update of missing domain', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.update('bad', {})).rejects.toThrow(NotFoundException);
    });

    it('should delete a domain', async () => {
        const result = await controller.delete('d1');
        expect(result).toEqual({ deleted: true, id: 'd1' });
    });

    it('should throw 404 on delete of missing domain', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.delete('bad')).rejects.toThrow(NotFoundException);
    });

    it('should export a domain', async () => {
        const result = await controller.exportDomain('d1');
        expect(result.domain.name).toBe('Test');
    });

    it('should throw 404 on export of missing domain', async () => {
        service.exportDomain.mockResolvedValue(null);
        await expect(controller.exportDomain('bad')).rejects.toThrow(NotFoundException);
    });

    it('should import a domain', async () => {
        const result = await controller.importDomain({ domain: { name: 'Imported' }, rules: [] });
        expect(service.importDomain).toHaveBeenCalled();
    });
});
