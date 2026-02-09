import { IsString, IsOptional, IsBoolean, IsObject, IsNotEmpty, IsInt, IsDateString, Min } from 'class-validator';

export class CreateRuleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsNotEmpty()
    domainId: string;

    @IsObject()
    jsonLogic: Record<string, any>;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    priority?: number;

    @IsOptional()
    @IsString()
    environment?: string; // "production" | "staging" | "development"

    @IsOptional()
    @IsDateString()
    startDate?: string; // ISO date — scheduling

    @IsOptional()
    @IsDateString()
    endDate?: string; // ISO date — scheduling
}
