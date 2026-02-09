import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';

// Polyfill AbortSignal.timeout if not available in test env
if (!AbortSignal.timeout) {
    (AbortSignal as any).timeout = (ms: number) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    };
}

// Mock global fetch
global.fetch = jest.fn();

describe('WebhooksService', () => {
    let service: WebhooksService;
    let prisma: any;

    const mockWebhook = {
        id: 'wh-1',
        name: 'My Hook',
        url: 'https://example.com/webhook',
        events: ['rule.created', 'rule.updated'],
        secret: 'my-secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        prisma = {
            webhook: {
                findMany: jest.fn().mockResolvedValue([mockWebhook]),
                findUnique: jest.fn().mockResolvedValue(mockWebhook),
                create: jest.fn().mockResolvedValue(mockWebhook),
                update: jest.fn().mockResolvedValue(mockWebhook),
                delete: jest.fn().mockResolvedValue(mockWebhook),
            },
        };

        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhooksService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<WebhooksService>(WebhooksService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should list all webhooks', async () => {
        const result = await service.findAll();
        expect(result).toHaveLength(1);
    });

    it('should find one webhook', async () => {
        const result = await service.findOne('wh-1');
        expect(result?.name).toBe('My Hook');
    });

    it('should create a webhook', async () => {
        await service.create({
            name: 'New Hook',
            url: 'https://example.com/hook',
            events: ['rule.created'],
        });

        expect(prisma.webhook.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ name: 'New Hook' }),
        });
    });

    it('should update a webhook', async () => {
        await service.update('wh-1', { name: 'Updated' });
        expect(prisma.webhook.update).toHaveBeenCalledWith({
            where: { id: 'wh-1' },
            data: { name: 'Updated' },
        });
    });

    it('should delete a webhook', async () => {
        await service.delete('wh-1');
        expect(prisma.webhook.delete).toHaveBeenCalledWith({ where: { id: 'wh-1' } });
    });

    it('should emit to matching webhooks', async () => {
        await service.emit('rule.created', { ruleId: 'r1' });

        // Wait for fire-and-forget to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/webhook',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('should not emit to non-matching webhooks', async () => {
        await service.emit('domain.deleted', { domainId: 'd1' });
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should emit to wildcard webhooks', async () => {
        prisma.webhook.findMany.mockResolvedValue([
            { ...mockWebhook, events: ['*'] },
        ]);

        await service.emit('any.event', { data: 'test' });
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(global.fetch).toHaveBeenCalled();
    });

    it('should include HMAC signature when secret is set', async () => {
        await service.emit('rule.created', { ruleId: 'r1' });
        await new Promise(resolve => setTimeout(resolve, 100));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        expect(fetchCall[1].headers['X-Webhook-Signature']).toMatch(/^sha256=/);
    });

    it('should handle delivery failures gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        // Should not throw
        await service.emit('rule.created', { ruleId: 'r1' });
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should skip inactive webhooks (query returns empty)', async () => {
        // Prisma's `where: { isActive: true }` filters at DB level,
        // so mock returns empty array to simulate no active webhooks
        prisma.webhook.findMany.mockResolvedValue([]);

        await service.emit('rule.created', { ruleId: 'r1' });
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(global.fetch).not.toHaveBeenCalled();
    });
});
