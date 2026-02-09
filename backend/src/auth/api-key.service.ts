/**
 * API Key Service — Secure key generation, validation, and lifecycle management.
 *
 * Manages API keys for programmatic access to the rules engine. Keys use a
 * one-way SHA-256 hash for storage — the raw key is only returned once at
 * generation time and can never be retrieved again.
 *
 * Key format: `rk_<random-hex>` (prefix + 48 random bytes as hex)
 *
 * Key behaviors:
 * - SHA-256 hashed storage (raw key never persisted)
 * - Prefix stored separately for identification (first 8 chars)
 * - Validation checks: existence, isActive, and expiresAt
 * - lastUsed timestamp updated on every successful validation
 * - Revocation sets isActive=false (soft disable)
 *
 * @module ApiKeyService
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKey } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
    constructor(private prisma: PrismaService) { }

    private hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    async generateKey(name: string, scopes: string[] = ['execute', 'read']): Promise<{ apiKey: ApiKey; rawKey: string }> {
        // Generate a random API key
        const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = this.hashKey(rawKey);
        const prefix = rawKey.substring(0, 11); // "rk_" + 8 chars

        const apiKey = await this.prisma.apiKey.create({
            data: {
                name,
                keyHash,
                prefix,
                scopes: scopes as any,
            },
        });

        // Return raw key only once — it's not stored
        return { apiKey, rawKey };
    }

    async validateKey(rawKey: string): Promise<ApiKey | null> {
        const keyHash = this.hashKey(rawKey);
        const key = await this.prisma.apiKey.findUnique({ where: { keyHash } });

        if (!key || !key.isActive) return null;
        if (key.expiresAt && key.expiresAt < new Date()) return null;

        // Update last used
        await this.prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsed: new Date() },
        });

        return key;
    }

    async findAll(): Promise<ApiKey[]> {
        return this.prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async revoke(id: string): Promise<ApiKey> {
        return this.prisma.apiKey.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async delete(id: string): Promise<ApiKey> {
        return this.prisma.apiKey.delete({ where: { id } });
    }
}
