/**
 * Audit Service — Immutable audit trail for all entity changes.
 *
 * Records before/after state snapshots for every create, update, delete,
 * rollback, and import operation. This module is registered globally so it
 * can be injected by any other service without explicit imports.
 *
 * Key behaviors:
 * - Log entries are append-only (immutable)
 * - Supports before/after JSON snapshots for diff comparison
 * - Filterable by entityType, entityId, and action
 * - Paginated with configurable limit/offset (default: 50 per page)
 * - Indexed for fast lookups: (entityType, entityId), (createdAt), (action)
 *
 * @module AuditService
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLog } from '@prisma/client';

export interface AuditEntry {
    entityType: string;
    entityId: string;
    action: string;
    actor?: string;
    before?: any;
    after?: any;
    metadata?: any;
}

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(entry: AuditEntry): Promise<AuditLog> {
        return this.prisma.auditLog.create({
            data: {
                entityType: entry.entityType,
                entityId: entry.entityId,
                action: entry.action,
                actor: entry.actor ?? 'system',
                before: entry.before ?? undefined,
                after: entry.after ?? undefined,
                metadata: entry.metadata ?? undefined,
            },
        });
    }

    async findAll(params: {
        entityType?: string;
        entityId?: string;
        action?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: AuditLog[]; total: number }> {
        const where: any = {};
        if (params.entityType) where.entityType = params.entityType;
        if (params.entityId) where.entityId = params.entityId;
        if (params.action) where.action = params.action;

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: params.limit ?? 50,
                skip: params.offset ?? 0,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { data, total };
    }
}
