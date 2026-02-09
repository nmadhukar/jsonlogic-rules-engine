/**
 * @module AiService
 * @description Provides AI-powered rule generation and code generation using OpenAI.
 * 
 * Two capabilities:
 * 1. **Generate Rule** — Convert natural-language descriptions into valid JSONLogic.
 * 2. **Generate Code** — Produce integration sample code that uses a given rule,
 *    in .NET, NestJS/TypeScript, or Python.
 */
import { Injectable, Logger } from '@nestjs/common';

/** Shape of the response from the rule generator */
export interface GenerateRuleResult {
    jsonLogic: any;
    explanation: string;
}

/** Shape of the response from the code generator */
export interface GenerateCodeResult {
    code: string;
    language: string;
    explanation: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // ──────────────────────────────────────────────────
    //  SYSTEM PROMPTS
    // ──────────────────────────────────────────────────

    private readonly RULE_SYSTEM_PROMPT = `You are an expert at creating JSONLogic rules (http://jsonlogic.com).

Your job is to convert a natural-language business rule description into a valid JSONLogic JSON object.

IMPORTANT RULES:
- Output ONLY valid JSON — no markdown fences, no backticks, no prose around the JSON.
- Use the standard JSONLogic operators: ==, !=, >, >=, <, <=, and, or, !, if, in, cat, var, missing, some, all, none, merge, +, -, *, /
- The "var" operator is used to access input data fields: {"var": "path.to.field"}
- For nested data use dot notation: {"var": "patient.age"}, {"var": "order.items.0.price"}
- Always return a JSON object with exactly two keys: "jsonLogic" and "explanation".
- "jsonLogic" must be the JSONLogic rule object.
- "explanation" must be a short human-readable explanation of what the rule does.

EXAMPLES:

Input: "Patient is 65 or older"
Output: {"jsonLogic": {">=": [{"var": "patient.age"}, 65]}, "explanation": "Checks if patient.age is greater than or equal to 65"}

Input: "Order total exceeds 100 and customer is VIP"
Output: {"jsonLogic": {"and": [{">" : [{"var": "order.total"}, 100]}, {"==": [{"var": "customer.tier"}, "vip"]}]}, "explanation": "Checks if order total > 100 AND customer tier is 'vip'"}

Input: "Temperature is between 36 and 38"
Output: {"jsonLogic": {"and": [{">=": [{"var": "temperature"}, 36]}, {"<=": [{"var": "temperature"}, 38]}]}, "explanation": "Checks if temperature is in the range [36, 38]"}`;

    private readonly CODE_SYSTEM_PROMPT = `You are an expert developer generating integration code for a JSONLogic Rules Engine REST API.

The Rules Engine exposes these key endpoints:
- POST /execute — Execute all active rules in a domain against provided data
  Request: { "domainId": "uuid", "data": { ... } }
  Response: { "results": [{ "ruleId": "uuid", "ruleName": "...", "passed": true/false, "result": any }], "executionTimeMs": number }
- GET /rules?domainId=uuid — List rules in a domain
- POST /rules — Create a rule: { "name": "...", "domainId": "uuid", "jsonLogic": {...}, "priority": 0, "environment": "production" }
- PUT /rules/:id — Update a rule
- GET /domains — List domains
- POST /domains — Create a domain

IMPORTANT RULES FOR CODE GENERATION:
- Output ONLY the code — no markdown fences, no backticks wrapping the code.
- Include all necessary imports/using statements.
- Include clear comments explaining each step.
- Show how to create the specific rule being referenced and how to execute it.
- Handle errors properly in the generated code.
- Use modern, idiomatic code for the target language.
- Include a complete working example with a main function/entry point.
- Return a JSON object with "code", "language", and "explanation" keys.`;

    // ──────────────────────────────────────────────────
    //  PUBLIC METHODS
    // ──────────────────────────────────────────────────

    /**
     * Generate a JSONLogic rule from a natural language description.
     */
    async generateRule(
        prompt: string,
        domainFields: string[],
        apiKey: string,
    ): Promise<GenerateRuleResult> {
        const fieldContext = domainFields.length > 0
            ? `\n\nAvailable fields in this domain: ${domainFields.join(', ')}. Use these field names in your "var" references where applicable.`
            : '';

        const userMessage = `Convert this business rule to JSONLogic: "${prompt}"${fieldContext}`;

        const responseText = await this.callOpenAI(
            this.RULE_SYSTEM_PROMPT,
            userMessage,
            apiKey,
        );

        try {
            const parsed = JSON.parse(responseText);
            return {
                jsonLogic: parsed.jsonLogic ?? parsed,
                explanation: parsed.explanation ?? 'Rule generated successfully',
            };
        } catch {
            this.logger.warn('Failed to parse AI response as JSON, attempting extraction');
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    jsonLogic: parsed.jsonLogic ?? parsed,
                    explanation: parsed.explanation ?? 'Rule generated successfully',
                };
            }
            throw new Error('Failed to parse AI response into valid JSONLogic');
        }
    }

    /**
     * Generate integration sample code for a given rule.
     */
    async generateCode(
        rule: { name: string; jsonLogic: any; domainId: string },
        language: 'dotnet' | 'nestjs' | 'python',
        apiKey: string,
    ): Promise<GenerateCodeResult> {
        const langDescMap: Record<string, string> = {
            dotnet: 'C# / .NET 8 (use HttpClient, System.Text.Json, and async/await patterns)',
            nestjs: 'TypeScript / NestJS (use HttpService or fetch, with proper NestJS module/service patterns)',
            python: 'Python 3 (use the requests library with proper error handling)',
        };

        const userMessage = `Generate a complete working integration example in ${langDescMap[language]} that does the following:

1. Creates (or references) this rule on the Rules Engine API:
   - Rule Name: "${rule.name}"
   - JSONLogic: ${JSON.stringify(rule.jsonLogic)}
   - Domain ID: "${rule.domainId}"

2. Executes the rule by calling POST /execute with sample data that matches the rule's variables.

3. Handles the response, checking which rules passed and which failed.

4. Includes proper error handling and configuration (base URL as a config parameter).

Return a JSON object with exactly three keys: "code" (the full source code), "language" ("${language}"), and "explanation" (a brief description of the code).`;

        const responseText = await this.callOpenAI(
            this.CODE_SYSTEM_PROMPT,
            userMessage,
            apiKey,
        );

        try {
            const parsed = JSON.parse(responseText);
            return {
                code: parsed.code ?? responseText,
                language: parsed.language ?? language,
                explanation: parsed.explanation ?? 'Integration code generated',
            };
        } catch {
            // If response is not JSON, treat entire response as code
            return {
                code: responseText,
                language,
                explanation: 'Integration code generated',
            };
        }
    }

    // ──────────────────────────────────────────────────
    //  PRIVATE — OpenAI HTTP call
    // ──────────────────────────────────────────────────

    private async callOpenAI(
        systemPrompt: string,
        userMessage: string,
        apiKey: string,
    ): Promise<string> {
        const url = 'https://api.openai.com/v1/chat/completions';
        const body = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.2,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            this.logger.error(`OpenAI API error: ${response.status} ${errorBody}`);
            throw new Error(`OpenAI API error: ${response.status} — ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
    }
}
