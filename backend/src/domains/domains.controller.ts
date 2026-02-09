import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { Domain } from '@prisma/client';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@Controller('domains')
export class DomainsController {
    constructor(private readonly domainsService: DomainsService) { }

    @Get()
    async findAll(): Promise<Domain[]> {
        return this.domainsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Domain> {
        const domain = await this.domainsService.findOne(id);
        if (!domain) {
            throw new NotFoundException(`Domain with id "${id}" not found`);
        }
        return domain;
    }

    @Post()
    async create(@Body() dto: CreateDomainDto): Promise<Domain> {
        return this.domainsService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateDomainDto): Promise<Domain> {
        const existing = await this.domainsService.findOne(id);
        if (!existing) {
            throw new NotFoundException(`Domain with id "${id}" not found`);
        }
        return this.domainsService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<{ deleted: boolean; id: string }> {
        const existing = await this.domainsService.findOne(id);
        if (!existing) {
            throw new NotFoundException(`Domain with id "${id}" not found`);
        }
        await this.domainsService.delete(id);
        return { deleted: true, id };
    }

    // ── Import / Export ──

    @Get(':id/export')
    async exportDomain(@Param('id') id: string) {
        const data = await this.domainsService.exportDomain(id);
        if (!data) {
            throw new NotFoundException(`Domain with id "${id}" not found`);
        }
        return data;
    }

    @Post('import')
    async importDomain(@Body() payload: any): Promise<Domain> {
        return this.domainsService.importDomain(payload);
    }
}
