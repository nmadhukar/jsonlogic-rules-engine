import { IsString, IsArray, IsOptional, IsIn } from 'class-validator';

export class GenerateRuleDto {
    @IsString()
    prompt: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    domainFields?: string[];

    @IsString()
    openaiApiKey: string;
}

export class GenerateCodeDto {
    @IsString()
    ruleName: string;

    jsonLogic: any;

    @IsString()
    domainId: string;

    @IsString()
    @IsIn(['dotnet', 'nestjs', 'python'])
    language: 'dotnet' | 'nestjs' | 'python';

    @IsString()
    openaiApiKey: string;
}
