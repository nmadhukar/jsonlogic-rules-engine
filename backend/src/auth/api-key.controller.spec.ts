import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyController', () => {
    let controller: ApiKeyController;
    let service: any;

    const mockKey = { id: 'k1', name: 'Test', prefix: 'rk_abc12345', scopes: ['execute'], isActive: true, lastUsed: null, expiresAt: null, createdAt: new Date(), keyHash: 'should-be-hidden' };

    beforeEach(async () => {
        service = {
            findAll: jest.fn().mockResolvedValue([mockKey]),
            generateKey: jest.fn().mockResolvedValue({ apiKey: mockKey, rawKey: 'rk_fullkeyhere' }),
            revoke: jest.fn().mockResolvedValue({ ...mockKey, isActive: false }),
            delete: jest.fn().mockResolvedValue(mockKey),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApiKeyController],
            providers: [{ provide: ApiKeyService, useValue: service }],
        }).compile();
        controller = module.get<ApiKeyController>(ApiKeyController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should list keys without keyHash', async () => {
        const result = await controller.findAll();
        expect(result[0].prefix).toBe('rk_abc12345');
        expect((result[0] as any).keyHash).toBeUndefined();
    });

    it('should create a key and return rawKey with warning', async () => {
        const result = await controller.create({ name: 'New Key' });
        expect(result.rawKey).toBe('rk_fullkeyhere');
        expect(result.warning).toContain('not be shown again');
    });

    it('should revoke a key', async () => {
        const result = await controller.revoke('k1');
        expect(result.isActive).toBe(false);
    });

    it('should delete a key', async () => {
        const result = await controller.delete('k1');
        expect(result).toEqual({ deleted: true, id: 'k1' });
    });
});
