import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateDomainDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsArray()
    fields: any[];

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
