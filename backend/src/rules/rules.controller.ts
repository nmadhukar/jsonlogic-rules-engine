import { Controller, Get, Post, Body, Param, Put, Delete, Query, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { RulesService } from './rules.service';
import { Rule, RuleVersion } from '@prisma/client';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Controller('rules')
export class RulesController {
    constructor(private readonly rulesService: RulesService) { }

    @Get()
    async findAll(@Query('domainId') domainId?: string): Promise<Rule[]> {
        return this.rulesService.findAll(domainId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Rule> {
        const rule = await this.rulesService.findOne(id);
        if (!rule) {
            throw new NotFoundException(`Rule with id "${id}" not found`);
        }
        return rule;
    }

    @Post()
    async create(@Body() dto: CreateRuleDto): Promise<Rule> {
        return this.rulesService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateRuleDto): Promise<Rule> {
        const existing = await this.rulesService.findOne(id);
        if (!existing) {
            throw new NotFoundException(`Rule with id "${id}" not found`);
        }
        return this.rulesService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string): Promise<{ deleted: boolean; id: string }> {
        const existing = await this.rulesService.findOne(id);
        if (!existing) {
            throw new NotFoundException(`Rule with id "${id}" not found`);
        }
        await this.rulesService.remove(id);
        return { deleted: true, id };
    }

    // ── Versioning ──

    @Get(':id/versions')
    async getVersions(@Param('id') id: string): Promise<RuleVersion[]> {
        const rule = await this.rulesService.findOne(id);
        if (!rule) {
            throw new NotFoundException(`Rule with id "${id}" not found`);
        }
        return this.rulesService.getVersions(id);
    }

    @Post(':id/rollback/:version')
    async rollback(
        @Param('id') id: string,
        @Param('version') version: string,
    ): Promise<Rule> {
        const rule = await this.rulesService.findOne(id);
        if (!rule) {
            throw new NotFoundException(`Rule with id "${id}" not found`);
        }
        try {
            return await this.rulesService.rollback(id, parseInt(version, 10));
        } catch (error: any) {
            throw new NotFoundException(error.message);
        }
    }
}
