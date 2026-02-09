import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private apiKeyService: ApiKeyService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            // Allow unauthenticated access if no guard is required
            // For controlled endpoints, wrap with @UseGuards(ApiKeyGuard)
            throw new UnauthorizedException('API key is required. Set X-API-Key header.');
        }

        const valid = await this.apiKeyService.validateKey(apiKey);
        if (!valid) {
            throw new UnauthorizedException('Invalid or expired API key.');
        }

        // Attach key info to request for scope checking
        request.apiKeyInfo = valid;
        return true;
    }
}
