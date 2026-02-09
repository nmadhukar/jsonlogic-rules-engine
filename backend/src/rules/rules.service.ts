/**
 * Rules Service — CRUD operations with automatic versioning and audit trails.
 *
 * Manages the full lifecycle of business rules: creation, updates, deletion,
 * version tracking, and rollback. When a rule's JSONLogic is modified, a new
 * version is automatically created. All mutations are audited via the AuditService.
 *
 * Key behaviors:
 * - Priority, environment, and scheduling fields are propagated on create/update
 * - Version history is maintained for every JSONLogic change
 * - Rollback restores a rule to any historical version and creates a version record
 * - Deletion cascades to all version history via onDelete: Cascade
 *
 * @module RulesService
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rule, RuleVersion } from '@prisma/client';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RulesService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) { }

    async findAll(domainId?: string): Promise<Rule[]> {
        const where: any = {};
        if (domainId) where.domainId = domainId;
        return this.prisma.rule.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async findOne(id: string): Promise<Rule | null> {
        return this.prisma.rule.findUnique({ where: { id } });
    }

    async create(dto: CreateRuleDto): Promise<Rule> {
        const rule = await this.prisma.rule.create({
            data: {
                name: dto.name,
                description: dto.description,
                domainId: dto.domainId,
                jsonLogic: dto.jsonLogic,
                isActive: dto.isActive ?? true,
                priority: dto.priority ?? 0,
                environment: dto.environment ?? 'production',
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
            },
        });

        // Create initial version (v1)
        await this.prisma.ruleVersion.create({
            data: {
                ruleId: rule.id,
                version: 1,
                name: rule.name,
                jsonLogic: rule.jsonLogic as any,
                changeMsg: 'Initial creation',
                changedBy: 'system',
            },
        });

        await this.audit.log({
            entityType: 'Rule',
            entityId: rule.id,
            action: 'CREATE',
            after: rule,
        });

        return rule;
    }

    async update(id: string, dto: UpdateRuleDto): Promise<Rule> {
        const before = await this.prisma.rule.findUnique({ where: { id } });
        if (!before) {
            throw new Error(`Rule "${id}" not found`);
        }

        const updateData: Record<string, any> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.jsonLogic !== undefined) updateData.jsonLogic = dto.jsonLogic;
        if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
        if (dto.priority !== undefined) updateData.priority = dto.priority;
        if (dto.environment !== undefined) updateData.environment = dto.environment;
        if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
        if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

        const rule = await this.prisma.rule.update({
            where: { id },
            data: updateData,
        });

        // Auto-version on jsonLogic change
        if (dto.jsonLogic !== undefined) {
            const lastVersion = await this.prisma.ruleVersion.findFirst({
                where: { ruleId: id },
                orderBy: { version: 'desc' },
            });
            const nextVersion = (lastVersion?.version ?? 0) + 1;

            await this.prisma.ruleVersion.create({
                data: {
                    ruleId: id,
                    version: nextVersion,
                    name: rule.name,
                    jsonLogic: dto.jsonLogic as any,
                    changeMsg: dto.description ?? `Version ${nextVersion}`,
                    changedBy: 'system',
                },
            });
        }

        await this.audit.log({
            entityType: 'Rule',
            entityId: id,
            action: 'UPDATE',
            before,
            after: rule,
        });

        return rule;
    }

    async remove(id: string): Promise<Rule> {
        const before = await this.prisma.rule.findUnique({ where: { id } });

        // Delete versions first (cascade)
        await this.prisma.ruleVersion.deleteMany({ where: { ruleId: id } });
        const rule = await this.prisma.rule.delete({ where: { id } });

        await this.audit.log({
            entityType: 'Rule',
            entityId: id,
            action: 'DELETE',
            before,
        });

        return rule;
    }

    // ── Versioning ──

    async getVersions(ruleId: string): Promise<RuleVersion[]> {
        return this.prisma.ruleVersion.findMany({
            where: { ruleId },
            orderBy: { version: 'desc' },
        });
    }

    async rollback(ruleId: string, version: number): Promise<Rule> {
        const ruleVersion = await this.prisma.ruleVersion.findUnique({
            where: { ruleId_version: { ruleId, version } },
        });

        if (!ruleVersion) {
            throw new Error(`Version ${version} not found for rule ${ruleId}`);
        }

        const before = await this.prisma.rule.findUnique({ where: { id: ruleId } });

        const rule = await this.prisma.rule.update({
            where: { id: ruleId },
            data: {
                name: ruleVersion.name,
                jsonLogic: ruleVersion.jsonLogic as any,
            },
        });

        // Create a new version entry for the rollback
        const lastVersion = await this.prisma.ruleVersion.findFirst({
            where: { ruleId },
            orderBy: { version: 'desc' },
        });
        const nextVersion = (lastVersion?.version ?? 0) + 1;

        await this.prisma.ruleVersion.create({
            data: {
                ruleId,
                version: nextVersion,
                name: ruleVersion.name,
                jsonLogic: ruleVersion.jsonLogic as any,
                changeMsg: `Rollback to version ${version}`,
                changedBy: 'system',
            },
        });

        await this.audit.log({
            entityType: 'Rule',
            entityId: ruleId,
            action: 'ROLLBACK',
            before,
            after: rule,
            metadata: { rolledBackToVersion: version },
        });

        return rule;
    }
}
