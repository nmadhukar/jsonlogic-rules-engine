import { IsString, IsOptional, IsBoolean, IsObject, IsInt, IsDateString, Min } from 'class-validator';

export class UpdateRuleDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsObject()
    jsonLogic?: Record<string, any>;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    priority?: number;

    @IsOptional()
    @IsString()
    environment?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
