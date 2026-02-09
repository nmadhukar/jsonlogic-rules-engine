import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService) { }

    @Get()
    async findAll() {
        const keys = await this.apiKeyService.findAll();
        // Never expose keyHash
        return keys.map(k => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            scopes: k.scopes,
            isActive: k.isActive,
            lastUsed: k.lastUsed,
            expiresAt: k.expiresAt,
            createdAt: k.createdAt,
        }));
    }

    @Post()
    async create(@Body() body: { name: string; scopes?: string[] }) {
        const { apiKey, rawKey } = await this.apiKeyService.generateKey(body.name, body.scopes);
        return {
            id: apiKey.id,
            name: apiKey.name,
            prefix: apiKey.prefix,
            scopes: apiKey.scopes,
            rawKey, // Only returned once!
            warning: 'Save this key now. It will not be shown again.',
        };
    }

    @Post(':id/revoke')
    async revoke(@Param('id') id: string) {
        const key = await this.apiKeyService.revoke(id);
        return { id: key.id, isActive: false };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        await this.apiKeyService.delete(id);
        return { deleted: true, id };
    }
}
