/**
 * Domains Service — Domain management with seeding, import/export, and cascading deletes.
 *
 * Domains are logical containers for related rules (e.g., "Healthcare", "Finance").
 * Each domain defines fields (what data rules can reference), templates, and presets.
 *
 * Key behaviors:
 * - On first startup, seeds Healthcare and HR demo domains if DB is empty
 * - Export produces a portable JSON package with the domain and all its rules
 * - Import is wrapped in a Prisma $transaction for atomicity (all-or-nothing)
 * - Delete cascades to: test cases → test suites → rule versions → rules → domain
 * - All mutations are audited
 *
 * @module DomainsService
 */
import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Domain } from '@prisma/client';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { AuditService } from '../audit/audit.service';

const HEALTHCARE_DOMAIN = {
    name: 'Healthcare',
    description: 'EMR/Patient logic — age checks, eligibility, encounter routing',
    fields: [
        { name: 'patient.age', label: 'Patient Age', inputType: 'number', defaultValue: 0 },
        { name: 'patient.gender', label: 'Patient Gender', inputType: 'text', valueEditorType: 'select', values: [{ name: 'male', label: 'Male' }, { name: 'female', label: 'Female' }], defaultValue: 'unknown' },
        { name: 'encounter.type', label: 'Encounter Type', inputType: 'text', valueEditorType: 'select', values: [{ name: 'inpatient', label: 'Inpatient' }, { name: 'outpatient', label: 'Outpatient' }, { name: 'emergency', label: 'Emergency' }], defaultValue: 'outpatient' },
        { name: 'diagnosis.code', label: 'Diagnosis Code', inputType: 'text' },
        { name: 'insurance.type', label: 'Insurance Type', inputType: 'text', valueEditorType: 'select', values: [{ name: 'medicare', label: 'Medicare' }, { name: 'medicaid', label: 'Medicaid' }, { name: 'private', label: 'Private' }] },
        { name: 'lab.result', label: 'Lab Result Value', inputType: 'number' },
    ],
    templates: [
        { id: 'medicare-eligible', name: 'Medicare Eligible', description: 'Patient age 65 or older', category: 'Eligibility', jsonLogic: { ">=": [{ "var": "patient.age" }, 65] } },
        { id: 'emergency-admit', name: 'Emergency Admission', description: 'Emergency encounter type', category: 'Routing', jsonLogic: { "==": [{ "var": "encounter.type" }, "emergency"] } },
        { id: 'high-risk-age', name: 'High Risk Age Group', description: 'Under 5 or over 80', category: 'Risk', jsonLogic: { "or": [{ "<": [{ "var": "patient.age" }, 5] }, { ">": [{ "var": "patient.age" }, 80] }] } },
    ],
    presets: [
        { name: 'Senior Patient', data: { patient: { age: 70, gender: 'female' }, encounter: { type: 'outpatient' }, insurance: { type: 'medicare' } } },
        { name: 'Pediatric Emergency', data: { patient: { age: 3, gender: 'male' }, encounter: { type: 'emergency' }, insurance: { type: 'medicaid' } } },
        { name: 'Adult Inpatient', data: { patient: { age: 45, gender: 'female' }, encounter: { type: 'inpatient' }, insurance: { type: 'private' } } },
    ]
};

const HR_DOMAIN = {
    name: 'HR',
    description: 'Employee qualification, benefits eligibility, and promotion logic',
    fields: [
        { name: 'employee.role', label: 'Role', inputType: 'text', valueEditorType: 'select', values: [{ name: 'engineer', label: 'Engineer' }, { name: 'manager', label: 'Manager' }, { name: 'hr', label: 'HR' }, { name: 'sales', label: 'Sales' }] },
        { name: 'employee.years_experience', label: 'Years Experience', inputType: 'number' },
        { name: 'employee.department', label: 'Department', inputType: 'text', valueEditorType: 'select', values: [{ name: 'engineering', label: 'Engineering' }, { name: 'sales', label: 'Sales' }, { name: 'marketing', label: 'Marketing' }, { name: 'operations', label: 'Operations' }] },
        { name: 'employee.salary', label: 'Current Salary', inputType: 'number' },
        { name: 'employee.performance_score', label: 'Performance Score (1-5)', inputType: 'number' },
        { name: 'certification.count', label: 'Certifications Count', inputType: 'number' },
    ],
    templates: [
        { id: 'senior-engineer', name: 'Senior Engineer', description: 'Engineer with 5+ years and high performance', category: 'Level', jsonLogic: { "and": [{ "==": [{ "var": "employee.role" }, "engineer"] }, { ">=": [{ "var": "employee.years_experience" }, 5] }, { ">=": [{ "var": "employee.performance_score" }, 4] }] } },
        { id: 'manager-promotion', name: 'Manager Promotion Eligible', description: '8+ years exp or 3+ certifications', category: 'Promotion', jsonLogic: { "or": [{ ">=": [{ "var": "employee.years_experience" }, 8] }, { ">=": [{ "var": "certification.count" }, 3] }] } },
        { id: 'benefits-eligible', name: 'Benefits Tier 2', description: 'Salary above 80K and 2+ years', category: 'Benefits', jsonLogic: { "and": [{ ">": [{ "var": "employee.salary" }, 80000] }, { ">=": [{ "var": "employee.years_experience" }, 2] }] } },
    ],
    presets: [
        { name: 'Senior Dev', data: { employee: { role: 'engineer', years_experience: 7, department: 'engineering', salary: 120000, performance_score: 4 }, certification: { count: 2 } } },
        { name: 'Junior Sales', data: { employee: { role: 'sales', years_experience: 1, department: 'sales', salary: 45000, performance_score: 3 }, certification: { count: 0 } } },
        { name: 'Mid Manager', data: { employee: { role: 'manager', years_experience: 10, department: 'operations', salary: 95000, performance_score: 5 }, certification: { count: 4 } } },
    ]
};

@Injectable()
export class DomainsService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService,
    ) { }

    async onModuleInit() {
        const count = await this.prisma.domain.count();
        if (count === 0) {
            console.log('Seeding initial domains...');
            await this.prisma.domain.create({ data: HEALTHCARE_DOMAIN });
            await this.prisma.domain.create({ data: HR_DOMAIN });
            console.log('Seeding complete: Healthcare, HR');
        }
    }

    async findAll(): Promise<Domain[]> {
        return this.prisma.domain.findMany({ orderBy: { name: 'asc' } });
    }

    async findOne(id: string): Promise<Domain | null> {
        return this.prisma.domain.findUnique({ where: { id } });
    }

    async create(dto: CreateDomainDto): Promise<Domain> {
        const domain = await this.prisma.domain.create({
            data: {
                name: dto.name,
                description: dto.description,
                fields: dto.fields ?? [],
                templates: dto.templates ?? [],
                presets: dto.presets ?? [],
                isActive: dto.isActive ?? true,
            },
        });

        await this.audit.log({
            entityType: 'Domain',
            entityId: domain.id,
            action: 'CREATE',
            after: domain,
        });

        return domain;
    }

    async update(id: string, dto: UpdateDomainDto): Promise<Domain> {
        const before = await this.prisma.domain.findUnique({ where: { id } });

        const updateData: Record<string, any> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.fields !== undefined) updateData.fields = dto.fields;
        if (dto.templates !== undefined) updateData.templates = dto.templates;
        if (dto.presets !== undefined) updateData.presets = dto.presets;
        if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

        const domain = await this.prisma.domain.update({
            where: { id },
            data: updateData,
        });

        await this.audit.log({
            entityType: 'Domain',
            entityId: id,
            action: 'UPDATE',
            before,
            after: domain,
        });

        return domain;
    }

    async delete(id: string): Promise<Domain> {
        const before = await this.prisma.domain.findUnique({ where: { id } });

        // Cascade: delete associated rules, test suites
        await this.prisma.testCase.deleteMany({
            where: { suite: { domainId: id } },
        });
        await this.prisma.testSuite.deleteMany({ where: { domainId: id } });
        await this.prisma.ruleVersion.deleteMany({
            where: { rule: { domainId: id } },
        });
        await this.prisma.rule.deleteMany({ where: { domainId: id } });

        const domain = await this.prisma.domain.delete({ where: { id } });

        await this.audit.log({
            entityType: 'Domain',
            entityId: id,
            action: 'DELETE',
            before,
        });

        return domain;
    }

    // ── Import / Export ──

    async exportDomain(id: string): Promise<any> {
        const domain = await this.prisma.domain.findUnique({
            where: { id },
            include: { rules: true },
        });
        if (!domain) return null;

        return {
            exportVersion: '1.0',
            exportedAt: new Date().toISOString(),
            domain: {
                name: domain.name,
                description: domain.description,
                fields: domain.fields,
                templates: domain.templates,
                presets: domain.presets,
                isActive: domain.isActive,
            },
            rules: domain.rules.map(r => ({
                name: r.name,
                description: r.description,
                jsonLogic: r.jsonLogic,
                priority: r.priority,
                isActive: r.isActive,
                environment: r.environment,
            })),
        };
    }

    async importDomain(payload: any): Promise<Domain> {
        const { domain: domainData, rules: rulesData } = payload;

        // Use transaction to ensure atomic import
        const domain = await this.prisma.$transaction(async (tx) => {
            const created = await tx.domain.create({
                data: {
                    name: domainData.name,
                    description: domainData.description,
                    fields: domainData.fields ?? [],
                    templates: domainData.templates ?? [],
                    presets: domainData.presets ?? [],
                    isActive: domainData.isActive ?? true,
                },
            });

            // Create rules inside transaction
            if (rulesData && Array.isArray(rulesData)) {
                for (const rule of rulesData) {
                    await tx.rule.create({
                        data: {
                            name: rule.name,
                            description: rule.description,
                            domainId: created.id,
                            jsonLogic: rule.jsonLogic,
                            priority: rule.priority ?? 0,
                            isActive: rule.isActive ?? true,
                            environment: rule.environment ?? 'production',
                        },
                    });
                }
            }

            return created;
        });

        await this.audit.log({
            entityType: 'Domain',
            entityId: domain.id,
            action: 'IMPORT',
            after: { domain: domainData, rulesCount: rulesData?.length ?? 0 },
        });

        return domain;
    }
}
