import { IsString, IsOptional, IsArray, IsObject, IsNotEmpty } from 'class-validator';

export class ExecuteRulesDto {
    @IsString()
    @IsNotEmpty()
    domainId: string;

    @IsObject()
    data: Record<string, any>;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    ruleIds?: string[];

    @IsOptional()
    @IsString()
    environment?: string; // default: "production"
}
