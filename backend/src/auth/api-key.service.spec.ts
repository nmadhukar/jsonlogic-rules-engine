import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from './api-key.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ApiKeyService', () => {
    let service: ApiKeyService;
    let prisma: any;

    const mockApiKey = {
        id: 'key-1',
        name: 'Test Key',
        keyHash: 'somehash',
        prefix: 'rk_abcdef12',
        scopes: ['execute', 'read'],
        isActive: true,
        lastUsed: null,
        expiresAt: null,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        prisma = {
            apiKey: {
                create: jest.fn().mockResolvedValue(mockApiKey),
                findUnique: jest.fn(),
                findMany: jest.fn().mockResolvedValue([mockApiKey]),
                update: jest.fn(),
                delete: jest.fn().mockResolvedValue(mockApiKey),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ApiKeyService>(ApiKeyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should generate a new API key', async () => {
        const result = await service.generateKey('My Key', ['execute']);

        expect(result.rawKey).toMatch(/^rk_/);
        expect(result.rawKey.length).toBeGreaterThan(20);
        expect(prisma.apiKey.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                name: 'My Key',
                prefix: expect.stringMatching(/^rk_/),
            }),
        });
    });

    it('should validate an active key', async () => {
        prisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
        prisma.apiKey.update.mockResolvedValue(mockApiKey);

        // We need to generate and then validate using the same hash
        const result = await service.validateKey('rk_test');

        expect(prisma.apiKey.findUnique).toHaveBeenCalled();
    });

    it('should return null for invalid key', async () => {
        prisma.apiKey.findUnique.mockResolvedValue(null);

        const result = await service.validateKey('rk_invalid');

        expect(result).toBeNull();
    });

    it('should return null for inactive key', async () => {
        prisma.apiKey.findUnique.mockResolvedValue({ ...mockApiKey, isActive: false });

        const result = await service.validateKey('rk_inactive');

        expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
        const expired = new Date(Date.now() - 86400000); // yesterday
        prisma.apiKey.findUnique.mockResolvedValue({ ...mockApiKey, expiresAt: expired });

        const result = await service.validateKey('rk_expired');

        expect(result).toBeNull();
    });

    it('should update lastUsed on valid key', async () => {
        prisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
        prisma.apiKey.update.mockResolvedValue(mockApiKey);

        await service.validateKey('rk_test');

        expect(prisma.apiKey.update).toHaveBeenCalledWith({
            where: { id: 'key-1' },
            data: { lastUsed: expect.any(Date) },
        });
    });

    it('should list all keys', async () => {
        const keys = await service.findAll();

        expect(keys).toHaveLength(1);
        expect(prisma.apiKey.findMany).toHaveBeenCalled();
    });

    it('should revoke a key', async () => {
        prisma.apiKey.update.mockResolvedValue({ ...mockApiKey, isActive: false });

        const result = await service.revoke('key-1');

        expect(prisma.apiKey.update).toHaveBeenCalledWith({
            where: { id: 'key-1' },
            data: { isActive: false },
        });
    });

    it('should delete a key', async () => {
        await service.delete('key-1');

        expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
    });

    it('should hash keys consistently', async () => {
        // Two calls with same raw key should produce same hash
        prisma.apiKey.findUnique.mockResolvedValue(null);
        await service.validateKey('rk_same_key');
        const firstCall = prisma.apiKey.findUnique.mock.calls[0][0].where.keyHash;

        await service.validateKey('rk_same_key');
        const secondCall = prisma.apiKey.findUnique.mock.calls[1][0].where.keyHash;

        expect(firstCall).toBe(secondCall);
    });
});
