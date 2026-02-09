import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateRuleDto, GenerateCodeDto } from './ai.dto';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * POST /ai/generate-rule
     * Convert a natural-language description into a JSONLogic rule.
     */
    @Post('generate-rule')
    async generateRule(@Body() dto: GenerateRuleDto) {
        try {
            return await this.aiService.generateRule(
                dto.prompt,
                dto.domainFields ?? [],
                dto.openaiApiKey,
            );
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to generate rule',
                error.message?.includes('OpenAI API error')
                    ? HttpStatus.BAD_GATEWAY
                    : HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * POST /ai/generate-code
     * Generate integration sample code for a specific rule.
     */
    @Post('generate-code')
    async generateCode(@Body() dto: GenerateCodeDto) {
        try {
            return await this.aiService.generateCode(
                {
                    name: dto.ruleName,
                    jsonLogic: dto.jsonLogic,
                    domainId: dto.domainId,
                },
                dto.language,
                dto.openaiApiKey,
            );
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to generate code',
                error.message?.includes('OpenAI API error')
                    ? HttpStatus.BAD_GATEWAY
                    : HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
