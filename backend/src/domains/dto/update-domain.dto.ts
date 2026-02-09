import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateDomainDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    fields?: any[];

    @IsOptional()
    @IsArray()
    templates?: any[];

    @IsOptional()
    @IsArray()
    presets?: any[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
