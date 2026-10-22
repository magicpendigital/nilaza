const fs = require('fs');
const { execSync } = require('child_process');

function runCommand(name, command) {
  console.log(`Running ${name}...`);
  try {
    return execSync(command, { stdio: 'pipe' }).toString();
  } catch (e) {
    console.error(`Error running ${name}`);
    let output = '';
    if (e.stdout) output += e.stdout.toString();
    if (e.stderr) output += e.stderr.toString();
    return output || e.message;
  }
}

try {
  const checkOut = runCommand('check', 'npm run mobile:check');
  const valOut = runCommand('validation', 'npm run validate:data');
  const testOut = runCommand('tests', 'npm --workspace apps/mobile run test -- --coverage');

  const report = `# Nilaza Test Report
Date: ${new Date().toISOString()}

## Type Check
\`\`\`
${checkOut}
\`\`\`

## Data Validation
\`\`\`
${valOut}
\`\`\`

## Unit Tests (Coverage)
\`\`\`
${testOut}
\`\`\`
`;
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results');
  }
  fs.writeFileSync('test-results/report.md', report);
  console.log('Report generated at test-results/report.md');
} catch (e) {
  console.error('Error generating report:', e.message);
}
