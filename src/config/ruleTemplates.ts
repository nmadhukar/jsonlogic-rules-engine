/**
 * Healthcare/EMR Rule Templates
 * Starter templates for common business rules
 */

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  jsonLogic: any;
}

export const ruleTemplates: RuleTemplate[] = [
  // ── Eligibility ──
  {
    id: 'medicare-eligible',
    name: 'Medicare Eligible',
    description: 'Patient is 65+ or has qualifying disability',
    category: 'Eligibility',
    jsonLogic: {
      "or": [
        { ">=": [{ "var": "patient.age" }, 65] },
        { "==": [{ "var": "patient.has_ssdi" }, true] }
      ]
    },
  },
  {
    id: 'adult-patient',
    name: 'Adult Patient',
    description: 'Patient is 18 or older',
    category: 'Eligibility',
    jsonLogic: { ">=": [{ "var": "patient.age" }, 18] },
  },
  {
    id: 'pediatric-patient',
    name: 'Pediatric Patient',
    description: 'Patient is under 18',
    category: 'Eligibility',
    jsonLogic: { "<": [{ "var": "patient.age" }, 18] },
  },

  // ── Authorization ──
  {
    id: 'prior-auth-required',
    name: 'Prior Authorization Required',
    description: 'High-cost procedures or controlled medications need auth',
    category: 'Authorization',
    jsonLogic: {
      "or": [
        { ">": [{ "var": "medication.cost" }, 500] },
        { "==": [{ "var": "medication.is_controlled" }, true] },
        { "in": [{ "var": "procedure.code" }, ["CT", "MRI", "PET"]] }
      ]
    },
  },
  {
    id: 'auth-approved',
    name: 'Authorization Approved',
    description: 'Check if authorization is approved',
    category: 'Authorization',
    jsonLogic: { "==": [{ "var": "authorization.status" }, "approved"] },
  },

  // ── Risk Assessment ──
  {
    id: 'high-risk-patient',
    name: 'High Risk Patient',
    description: 'Multiple chronic conditions or high risk score',
    category: 'Risk',
    jsonLogic: {
      "or": [
        { ">=": [{ "var": "patient.chronic_condition_count" }, 3] },
        { ">=": [{ "var": "patient.risk_score" }, 80] }
      ]
    },
  },
  {
    id: 'low-risk-patient',
    name: 'Low Risk Patient',
    description: 'No chronic conditions and low risk score',
    category: 'Risk',
    jsonLogic: {
      "and": [
        { "<=": [{ "var": "patient.chronic_condition_count" }, 1] },
        { "<": [{ "var": "patient.risk_score" }, 30] }
      ]
    },
  },

  // ── Vitals ──
  {
    id: 'hypertension-alert',
    name: 'Hypertension Alert',
    description: 'Blood pressure exceeds normal range',
    category: 'Vitals',
    jsonLogic: {
      "or": [
        { ">=": [{ "var": "vitals.blood_pressure_systolic" }, 140] },
        { ">=": [{ "var": "vitals.blood_pressure_diastolic" }, 90] }
      ]
    },
  },
  {
    id: 'low-oxygen-alert',
    name: 'Low Oxygen Saturation',
    description: 'O2 saturation below 92%',
    category: 'Vitals',
    jsonLogic: { "<": [{ "var": "vitals.oxygen_saturation" }, 92] },
  },
  {
    id: 'tachycardia-alert',
    name: 'Tachycardia Alert',
    description: 'Heart rate above 100 bpm',
    category: 'Vitals',
    jsonLogic: { ">": [{ "var": "vitals.heart_rate" }, 100] },
  },

  // ── Encounter ──
  {
    id: 'emergency-encounter',
    name: 'Emergency Encounter',
    description: 'Encounter type is Emergency',
    category: 'Encounter',
    jsonLogic: { "==": [{ "var": "encounter.type" }, "emergency"] },
  },
  {
    id: 'extended-stay',
    name: 'Extended Hospital Stay',
    description: 'Length of stay exceeds 7 days',
    category: 'Encounter',
    jsonLogic: { ">": [{ "var": "encounter.length_of_stay" }, 7] },
  },
];
