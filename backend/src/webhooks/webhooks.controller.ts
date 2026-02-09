import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Get()
    async findAll() {
        return this.webhooksService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const wh = await this.webhooksService.findOne(id);
        if (!wh) throw new NotFoundException(`Webhook "${id}" not found`);
        return wh;
    }

    @Post()
    async create(@Body() body: { name: string; url: string; events: string[]; secret?: string }) {
        return this.webhooksService.create(body);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        const wh = await this.webhooksService.findOne(id);
        if (!wh) throw new NotFoundException(`Webhook "${id}" not found`);
        return this.webhooksService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        await this.webhooksService.delete(id);
        return { deleted: true, id };
    }

    @Post('test/:id')
    async testWebhook(@Param('id') id: string) {
        const wh = await this.webhooksService.findOne(id);
        if (!wh) throw new NotFoundException(`Webhook "${id}" not found`);
        await this.webhooksService.emit('webhook.test', { webhookId: id, message: 'Test event' });
        return { sent: true, webhookId: id };
    }
}
