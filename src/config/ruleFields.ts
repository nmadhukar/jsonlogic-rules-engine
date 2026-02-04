/**
 * Healthcare/EMR Rule Fields
 * These define what business users see in dropdown menus
 */
import type { Field } from 'react-querybuilder';

export const ruleFields: Field[] = [
  // ── Patient Fields ──
  {
    name: 'patient.age',
    label: 'Patient Age',
    inputType: 'number',
    validator: (r) => !!r.value || r.value === 0,
    defaultValue: 0,
  },
  {
    name: 'patient.gender',
    label: 'Patient Gender',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'male', label: 'Male' },
      { name: 'female', label: 'Female' },
      { name: 'other', label: 'Other' },
      { name: 'unknown', label: 'Unknown' },
    ],
    defaultValue: 'unknown',
  },
  {
    name: 'patient.insurance_type',
    label: 'Insurance Type',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'medicare', label: 'Medicare' },
      { name: 'medicaid', label: 'Medicaid' },
      { name: 'commercial', label: 'Commercial' },
      { name: 'self_pay', label: 'Self Pay' },
      { name: 'workers_comp', label: 'Workers Comp' },
    ],
    defaultValue: 'commercial',
  },
  {
    name: 'patient.risk_score',
    label: 'Patient Risk Score',
    inputType: 'number',
    defaultValue: 0,
  },
  {
    name: 'patient.chronic_condition_count',
    label: 'Chronic Condition Count',
    inputType: 'number',
    defaultValue: 0,
  },
  {
    name: 'patient.has_ssdi',
    label: 'Has SSDI Disability',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'true', label: 'Yes' },
      { name: 'false', label: 'No' },
    ],
    defaultValue: 'false',
  },

  // ── Encounter Fields ──
  {
    name: 'encounter.type',
    label: 'Encounter Type',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'inpatient', label: 'Inpatient' },
      { name: 'outpatient', label: 'Outpatient' },
      { name: 'emergency', label: 'Emergency' },
      { name: 'telehealth', label: 'Telehealth' },
      { name: 'observation', label: 'Observation' },
    ],
    defaultValue: 'outpatient',
  },
  {
    name: 'encounter.admit_date',
    label: 'Admit Date',
    inputType: 'date',
  },
  {
    name: 'encounter.discharge_date',
    label: 'Discharge Date',
    inputType: 'date',
  },
  {
    name: 'encounter.length_of_stay',
    label: 'Length of Stay (days)',
    inputType: 'number',
    defaultValue: 0,
  },

  // ── Medication Fields ──
  {
    name: 'medication.drug_name',
    label: 'Drug Name',
    inputType: 'text',
    defaultValue: '',
  },
  {
    name: 'medication.is_controlled',
    label: 'Is Controlled Substance',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'true', label: 'Yes' },
      { name: 'false', label: 'No' },
    ],
    defaultValue: 'false',
  },
  {
    name: 'medication.cost',
    label: 'Medication Cost',
    inputType: 'number',
    defaultValue: 0,
  },

  // ── Procedure Fields ──
  {
    name: 'procedure.code',
    label: 'Procedure Code (CPT)',
    inputType: 'text',
    defaultValue: '',
  },
  {
    name: 'procedure.cost',
    label: 'Procedure Cost',
    inputType: 'number',
    defaultValue: 0,
  },

  // ── Vitals ──
  {
    name: 'vitals.blood_pressure_systolic',
    label: 'Systolic BP (mmHg)',
    inputType: 'number',
    defaultValue: 120,
  },
  {
    name: 'vitals.blood_pressure_diastolic',
    label: 'Diastolic BP (mmHg)',
    inputType: 'number',
    defaultValue: 80,
  },
  {
    name: 'vitals.heart_rate',
    label: 'Heart Rate (bpm)',
    inputType: 'number',
    defaultValue: 72,
  },
  {
    name: 'vitals.oxygen_saturation',
    label: 'O2 Saturation (%)',
    inputType: 'number',
    defaultValue: 98,
  },

  // ── Authorization Fields ──
  {
    name: 'authorization.is_required',
    label: 'Prior Auth Required',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'true', label: 'Yes' },
      { name: 'false', label: 'No' },
    ],
    defaultValue: 'false',
  },
  {
    name: 'authorization.status',
    label: 'Authorization Status',
    inputType: 'text',
    valueEditorType: 'select',
    values: [
      { name: 'pending', label: 'Pending' },
      { name: 'approved', label: 'Approved' },
      { name: 'denied', label: 'Denied' },
      { name: 'expired', label: 'Expired' },
    ],
    defaultValue: 'pending',
  },
];
