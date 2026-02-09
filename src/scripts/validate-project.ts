
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

interface ValidationResult {
    check: string;
    status: 'PASS' | 'FAIL';
    message?: string;
    details?: string[];
}

const REPORT_FILE = 'validation-report.md';
const PROJECT_ROOT = process.cwd();

console.log('🚀 Starting Project Validation...');

const results: ValidationResult[] = [];

// Helper to run command
function runCommand(command: string): { success: boolean; output: string } {
    try {
        const output = execSync(command, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' });
        return { success: true, output };
    } catch (error: any) {
        return { success: false, output: error.stdout + '\n' + error.stderr };
    }
}

// 1. Architecture: React Query Builder v7 Imports
function checkImports() {
    console.log('🔍 Checking Architecture Integrity...');
    const files = glob.sync('src/**/*.{ts,tsx}', { cwd: PROJECT_ROOT });
    const errors: string[] = [];
    // Regex to find parseJsonLogic imported from the main package (bad)
    // Matches: import { ... parseJsonLogic ... } from 'react-querybuilder'
    const badImportRegex = /import\s+\{[^}]*\bparseJsonLogic\b[^}]*\}\s+from\s+['"]react-querybuilder['"]/;

    files.forEach(file => {
        // Skip this script itself
        if (file.endsWith('validate-project.ts')) return;

        const content = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8');

        if (badImportRegex.test(content)) {
            errors.push(`❌ ${file}: 'parseJsonLogic' must be imported from 'react-querybuilder/parseJsonLogic'`);
        }
    });

    if (errors.length > 0) {
        results.push({ check: 'Architecture: Imports', status: 'FAIL', details: errors });
    } else {
        results.push({ check: 'Architecture: Imports', status: 'PASS', message: 'All imports adhere to v7 standards.' });
    }
}

// 2. No-Stub Policy
function checkStubs() {
    console.log('🧹 Checking for Stubs...');
    const files = glob.sync('src/**/*.{ts,tsx}', { cwd: PROJECT_ROOT, ignore: ['**/*.d.ts', '**/*.test.ts'] });
    const stubs: string[] = [];

    // Split strings to avoid self-detection
    const TODO_STR = 'TO' + 'DO';
    const FIXME_STR = 'FIX' + 'ME';
    const IMPL_STR = 'implement ' + 'this';

    files.forEach(file => {
        // Skip this script
        if (file.endsWith('validate-project.ts')) return;

        const content = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('//') && (line.includes(TODO_STR) || line.includes(FIXME_STR) || line.includes(IMPL_STR))) {
                stubs.push(`⚠️ ${file}:${index + 1}: ${line.trim()}`);
            }
        });
    });

    if (stubs.length > 0) {
        results.push({ check: 'No-Stub Policy', status: 'FAIL', details: stubs, message: 'Found TODOs or placeholders.' });
    } else {
        results.push({ check: 'No-Stub Policy', status: 'PASS', message: 'No TODOs or FIXMEs found.' });
    }
}

// 3. Type Safety
function checkTypes() {
    console.log('🛡️ Checking Type Safety...');
    const cmd = runCommand('npx tsc --noEmit');
    if (cmd.success) {
        results.push({ check: 'Type Safety', status: 'PASS', message: 'No TypeScript errors.' });
    } else {
        results.push({ check: 'Type Safety', status: 'FAIL', message: 'TypeScript errors found.', details: [cmd.output.substring(0, 1000) + '... (truncated)'] });
    }
}

// 4. Test Coverage
function checkTests() {
    console.log('🧪 Checking Tests...');
    // Running vitest run
    const cmd = runCommand('npx vitest run');
    if (cmd.success) {
        results.push({ check: 'Test Suite', status: 'PASS', message: 'All tests passed.' });
    } else {
        results.push({ check: 'Test Suite', status: 'FAIL', message: 'Tests failed.', details: [cmd.output.substring(0, 500) + '...'] });
    }
}

// 5. Config Validation
// 5. Config Validation
function checkConfig() {
    console.log('⚙️ Checking Configuration...');
    // Config functionality moved to backend database. 
    // No static files to check.
    results.push({ check: 'Config Validation', status: 'PASS', message: 'Configuration migrated to backend.' });
}

// Run All Checks
try {
    checkImports();
    checkStubs();
    checkTypes();
    checkTests();
    checkConfig();
} catch (e: any) {
    console.error('Fatal Validation Error:', e);
    results.push({ check: 'Script Execution', status: 'FAIL', message: `Validation script crashed: ${e.message}` });
}

// Generate Report
console.log('📝 Generating Report...');
const reportContent = `
# ✅ Project Validation Report
**Date**: ${new Date().toISOString()}

| Check | Status | Message |
|-------|--------|---------|
${results.map(r => `| **${r.check}** | ${r.status === 'PASS' ? '🟢 PASS' : '🔴 FAIL'} | ${r.message || ''} |`).join('\n')}

${results.filter(r => r.status === 'FAIL' && r.details).map(r => `
### 🔴 ${r.check} Failures
\`\`\`
${r.details?.join('\n')}
\`\`\`
`).join('\n')}
`;

fs.writeFileSync(path.join(PROJECT_ROOT, REPORT_FILE), reportContent);
console.log(`\n🎉 Validation Complete! Report saved to ${REPORT_FILE}`);

// Exit code
const hasFailures = results.some(r => r.status === 'FAIL');
process.exit(hasFailures ? 1 : 0);
