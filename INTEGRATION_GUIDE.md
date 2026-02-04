# JSONLogic Rules Engine - Integration Guide

This guide explains how to integrate the JSONLogic Rules Engine into your backend services.
It uses a concrete **Healthcare Billing** use case to demonstrate the end-to-end flow.

---

## 1. The Use Case: Fee Schedule Lookup
**Goal**: Determine the "Allowed Amount" (Price) for a claim based on:
1.  **Payer** (e.g., Medicare, BlueCross)
2.  **CPT Code** (e.g., 90837)
3.  **Modifier** (e.g., GT, 95)
4.  **Provider Credential** (e.g., MD, LCSW)

**Input Data (Context):**
```json
{
  "payer": { "id": "PAY-001", "type": "Medicare" },
  "claim": { "cpt": "90837", "modifier": "GT" },
  "provider": { "credential": "MD" }
}
```

**Rule Logic (Decision Table):**
- IF Payer=Medicare AND CPT=90837 AND Mod=GT AND Cred=MD THEN **$150.00**
- IF Payer=Medicare AND CPT=90837 AND Mod=GT AND Cred=LCSW THEN **$120.00**
- ELSE **$0.00** (Deny)

---

## 2. Shared Architecture (Mental Model)
The key concept is **"JSONLogic In, JSONLogic Out"**.
1.  **Frontend**: The React UI (`UnifiedRuleEditor`) saves the rule as a JSON blob to your database.
    -   *Note*: Decision Tables are compiled to standard JSONLogic `if/elseif/else` structures in the browser before saving.
2.  **Database**: Stores the JSON blob in a `jsonb` column.
3.  **Backend**: Fetches the JSON blob and applies it to the Input Data using a standard library.

---

## 3. .NET Integration (C#)

**Recommended Library**: `JsonLogic.Net` (or `NJsonLogic`)
`dotnet add package JsonLogic.Net`

### A. The Data Model
```csharp
public class BillingContext
{
    public PayerInfo Payer { get; set; }
    public ClaimInfo Claim { get; set; }
    public ProviderInfo Provider { get; set; }
}

public class PayerInfo { public string Type { get; set; } }
public class ClaimInfo { public string CPT { get; set; } public string Modifier { get; set; } }
public class ProviderInfo { public string Credential { get; set; } }
```

### B. The Service (Rule Engine)
```csharp
using JsonLogic.Net;
using Newtonsoft.Json.Linq; // or System.Text.Json

public class FeeScheduleService
{
    private readonly IJsonLogic _jsonLogic;
    private readonly IRuleRepository _repo;

    public FeeScheduleService(IRuleRepository repo)
    {
        _repo = repo;
        _jsonLogic = new JsonLogicEvaluator(EvaluateOperators.Default);
    }

    public decimal CalculateAllowedAmount(BillingContext context)
    {
        // 1. Fetch the Rule JSON from DB (saved by the React UI)
        // The rule is stored as a string or JsonDocument in DB
        var ruleJsonString = _repo.GetRule("fee_schedule_2024"); 
        
        // 2. Parse Rule and Data
        var rule = JObject.Parse(ruleJsonString);
        var data = JObject.FromObject(context);

        // 3. Execute
        // Apply(rule, data) returns the result defined in the rule
        var result = _jsonLogic.Apply(rule, data);

        return Convert.ToDecimal(result);
    }
}
```

### C. The Controller
```csharp
[HttpPost("calculate-fee")]
public ActionResult<decimal> CalculateFee([FromBody] BillingContext request)
{
    var amount = _feeScheduleService.CalculateAllowedAmount(request);
    
    if (amount == 0) return BadRequest("Claim Denied: No matching fee schedule rule.");
    
    return Ok(amount);
}
```

---

## 4. NestJS Integration (Node.js/TypeScript)

**Recommended Library**: `json-logic-js`
`npm install json-logic-js`

### A. The Data Model (DTO)
```typescript
class BillingContextDto {
  payer: { type: string };
  claim: { cpt: string; modifier: string };
  provider: { credential: string };
}
```

### B. The Service
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import * as jsonLogic from 'json-logic-js';
import { RulesRepository } from './rules.repository'; // Your DB repo

@Injectable()
export class FeeScheduleService {
  constructor(private rulesRepo: RulesRepository) {}

  async calculateAllowedAmount(context: BillingContextDto): Promise<number> {
    // 1. Fetch Rule from DB
    const ruleRecord = await this.rulesRepo.findOne({ name: 'fee_schedule_2024' });
    if (!ruleRecord) throw new NotFoundException('Rule not found');

    // 2. Execute
    // jsonLogic.apply(logic, data)
    const result = jsonLogic.apply(ruleRecord.json_logic, context);

    return Number(result);
  }
}
```

### C. The Controller
```typescript
import { Controller, Post, Body } from '@nestjs/common';

@Controller('billing')
export class BillingController {
  constructor(private feeService: FeeScheduleService) {}

  @Post('calculate')
  async calculateFee(@Body() context: BillingContextDto) {
    const amount = await this.feeService.calculateAllowedAmount(context);
    return { allowed_amount: amount };
  }
}
```

---

## 5. Important: Custom Operators
Standard JSONLogic has many operators (`==`, `>`, `if`, `map`, `reduce`).
However, if you use **Custom Operators** in the UI (like `startsWith`, `round`, or `collect_table`), you **MUST** implement them in your backend too.

### .NET Custom Operator Example (`startsWith`)
```csharp
// Register before usage
var evaluator = new JsonLogicEvaluator(EvaluateOperators.Default);
evaluator.Operators.Add("startsWith", (args, data) => 
{
    var str = args[0]?.ToString();
    var prefix = args[1]?.ToString();
    if (str == null || prefix == null) return false;
    return str.StartsWith(prefix);
});
```

### NestJS Custom Operator Example
```typescript
import * as jsonLogic from 'json-logic-js';

// Register globally at app bootstrap
jsonLogic.add_operation('startsWith', (str, prefix) => {
  if (!str || !prefix) return false;
  return str.startsWith(prefix);
});
```
