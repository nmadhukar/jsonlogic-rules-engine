import { Controller, Get, Post, Delete, Body, Param, Query, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { TestingService } from './testing.service';

@Controller('test-suites')
export class TestingController {
    constructor(private readonly testingService: TestingService) { }

    @Get()
    async findAll(@Query('domainId') domainId?: string) {
        return this.testingService.findAllSuites(domainId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const suite = await this.testingService.findSuite(id);
        if (!suite) throw new NotFoundException(`Test suite "${id}" not found`);
        return suite;
    }

    @Post()
    async create(@Body() body: { name: string; domainId: string }) {
        return this.testingService.createSuite(body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        await this.testingService.deleteSuite(id);
        return { deleted: true, id };
    }

    @Post(':id/cases')
    async addCase(@Param('id') suiteId: string, @Body() body: { name: string; inputData: any; expectedResult: any }) {
        return this.testingService.addCase(suiteId, body);
    }

    @Delete('cases/:caseId')
    @HttpCode(HttpStatus.OK)
    async deleteCase(@Param('caseId') caseId: string) {
        await this.testingService.deleteCase(caseId);
        return { deleted: true, id: caseId };
    }

    @Post(':id/run')
    async runSuite(@Param('id') id: string) {
        return this.testingService.runSuite(id);
    }
}
