/**
 * Webhooks Service — Event notification system with HMAC signing.
 *
 * Implements a fire-and-forget push notification model. When events occur
 * (rule created, updated, deleted, executed, etc.), active webhooks matching
 * the event are notified via HTTP POST.
 *
 * Key behaviors:
 * - Only active webhooks (`isActive: true`) are fired
 * - Supports wildcard subscriptions (`"*"`) to match all events
 * - Payloads are signed with HMAC-SHA256 when a secret is configured
 * - Each webhook request has a 10-second timeout
 * - Delivery failures are silently caught (fire-and-forget)
 * - All matching webhooks are fired concurrently via Promise.allSettled
 *
 * @module WebhooksService
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Webhook } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<Webhook[]> {
        return this.prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async findOne(id: string): Promise<Webhook | null> {
        return this.prisma.webhook.findUnique({ where: { id } });
    }

    async create(data: { name: string; url: string; events: string[]; secret?: string }): Promise<Webhook> {
        return this.prisma.webhook.create({
            data: {
                name: data.name,
                url: data.url,
                events: data.events as any,
                secret: data.secret,
            },
        });
    }

    async update(id: string, data: Partial<{ name: string; url: string; events: string[]; isActive: boolean }>): Promise<Webhook> {
        const updateData: Record<string, any> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.url !== undefined) updateData.url = data.url;
        if (data.events !== undefined) updateData.events = data.events;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        return this.prisma.webhook.update({ where: { id }, data: updateData });
    }

    async delete(id: string): Promise<Webhook> {
        return this.prisma.webhook.delete({ where: { id } });
    }

    /**
     * Emit event to all matching webhooks (fire-and-forget).
     */
    async emit(event: string, payload: any): Promise<void> {
        const webhooks = await this.prisma.webhook.findMany({
            where: { isActive: true },
        });

        const matching = webhooks.filter(wh => {
            const events = wh.events as string[];
            return events.includes(event) || events.includes('*');
        });

        for (const wh of matching) {
            this.sendWebhook(wh, event, payload).catch(err => {
                console.error(`Webhook delivery failed for ${wh.id}: ${err.message}`);
            });
        }
    }

    private async sendWebhook(webhook: Webhook, event: string, payload: any): Promise<void> {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (webhook.secret) {
            const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }
}
