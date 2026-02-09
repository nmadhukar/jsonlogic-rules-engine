import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { NotFoundException } from '@nestjs/common';

describe('WebhooksController', () => {
    let controller: WebhooksController;
    let service: any;

    const mockWebhook = { id: 'wh1', name: 'Hook', url: 'https://example.com', events: ['*'], isActive: true };

    beforeEach(async () => {
        service = {
            findAll: jest.fn().mockResolvedValue([mockWebhook]),
            findOne: jest.fn().mockResolvedValue(mockWebhook),
            create: jest.fn().mockResolvedValue(mockWebhook),
            update: jest.fn().mockResolvedValue(mockWebhook),
            delete: jest.fn().mockResolvedValue(mockWebhook),
            emit: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WebhooksController],
            providers: [{ provide: WebhooksService, useValue: service }],
        }).compile();
        controller = module.get<WebhooksController>(WebhooksController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('should list webhooks', async () => expect(await controller.findAll()).toHaveLength(1));
    it('should find one webhook', async () => expect((await controller.findOne('wh1')).name).toBe('Hook'));
    it('should throw 404 for missing webhook', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });
    it('should create a webhook', async () => {
        await controller.create({ name: 'New', url: 'https://h.com', events: ['*'] });
        expect(service.create).toHaveBeenCalled();
    });
    it('should update a webhook', async () => {
        await controller.update('wh1', { name: 'Updated' });
        expect(service.update).toHaveBeenCalledWith('wh1', { name: 'Updated' });
    });
    it('should throw 404 on update missing', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.update('bad', {})).rejects.toThrow(NotFoundException);
    });
    it('should delete a webhook', async () => {
        const result = await controller.delete('wh1');
        expect(result).toEqual({ deleted: true, id: 'wh1' });
    });
    it('should test a webhook', async () => {
        const result = await controller.testWebhook('wh1');
        expect(result).toEqual({ sent: true, webhookId: 'wh1' });
        expect(service.emit).toHaveBeenCalledWith('webhook.test', expect.any(Object));
    });
    it('should throw 404 on test missing', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.testWebhook('bad')).rejects.toThrow(NotFoundException);
    });
});
