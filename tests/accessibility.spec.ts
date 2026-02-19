import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:3002/';
const REPORT_FILE = './accessibility-report.html';

const violationCounts: Record<string, number> = {
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 0,
};

type ViolationsByImpact = {
  critical: string;
  serious: string;
  moderate: string;
  minor: string;
};

// ✅ Store global violations to avoid overwriting
const globalViolations: ViolationsByImpact = {
  critical: '',
  serious: '',
  moderate: '',
  minor: '',
};

// ✅ Utility to read all files recursively in `/src/components`
const getAllFiles = (dirPath: string): string[] => {
  let files: string[] = [];
  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      files = files.concat(getAllFiles(filePath));
    } else {
      files.push(filePath);
    }
  });
  return files;
};

// ✅ Function to format and append violations
const formatViolations = (violations: any[], source: string) => {
  if (!violations || violations.length === 0) {
    console.log(chalk.green(`✅ No violations found in ${source}`));
    return;
  }

  violations.forEach((violation) => {
    const color = {
      critical: chalk.red.bold,
      serious: chalk.yellow.bold,
      moderate: chalk.blue.bold,
      minor: chalk.green.bold,
    }[violation.impact] || chalk.white;

    console.log(color(`- ${violation.description} [Impact: ${violation.impact}]`));
    console.log(`  Help: ${violation.help}`);
    console.log(`  Affected nodes: ${violation.nodes.length}\n`);

    violationCounts[violation.impact]++;

    // ✅ Append to existing violations instead of overwriting
    globalViolations[violation.impact as keyof ViolationsByImpact] += `
      <div class="violation ${violation.impact}">
        <h3>
          🔥 ${violation.description}
          <span class="impact ${violation.impact}">[Impact: ${violation.impact}]</span>
        </h3>
        <p><strong>Help:</strong> ${violation.help}</p>
        <p><strong>Affected nodes:</strong> ${violation.nodes.length}</p>
        <p><strong>Source:</strong> ${source}</p>
      </div>
    `;
  });
};

// ✅ Function to generate HTML report
const generateHTMLReport = () => {
  const html = `
    <html>
      <head>
        <title>Accessibility Report</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f9;
            color: #333;
          }
          .sidebar {
            width: 250px;
            background-color: #2c3e50;
            padding: 20px;
            color: white;
            height: 100vh;
            position: fixed;
            overflow-y: auto;
          }
          .sidebar a {
            display: block;
            padding: 10px;
            margin-bottom: 10px;
            color: white;
            text-decoration: none;
            background-color: #34495e;
            border-radius: 4px;
            cursor: pointer;
          }
          .sidebar a:hover {
            background-color: #1abc9c;
          }
          .content {
            margin-left: 270px;
            padding: 20px;
            overflow-y: auto;
            width: calc(100% - 270px);
          }
          .violation {
            padding: 12px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #fff;
          }
          .critical { border-left: 6px solid red; }
          .serious { border-left: 6px solid orange; }
          .moderate { border-left: 6px solid blue; }
          .minor { border-left: 6px solid green; }
          .tab-content {
            display: none;
          }
          .active {
            display: block;
          }
        </style>
      </head>
      <body>

        <div class="sidebar">
          <h2>Accessibility Report</h2>
          <a onclick="showTab('chart')">📊 Overview (Chart)</a>
          <a onclick="showTab('critical')">🚨 Critical</a>
          <a onclick="showTab('serious')">⚠️ Serious</a>
          <a onclick="showTab('moderate')">🔵 Moderate</a>
          <a onclick="showTab('minor')">🟢 Minor</a>
        </div>

        <div class="content">
          <div id="chart" class="tab-content active">
            <canvas id="violationChart"></canvas>
          </div>
          <div id="critical" class="tab-content">${globalViolations.critical}</div>
          <div id="serious" class="tab-content">${globalViolations.serious}</div>
          <div id="moderate" class="tab-content">${globalViolations.moderate}</div>
          <div id="minor" class="tab-content">${globalViolations.minor}</div>
        </div>

        <script>
          function showTab(tab) {
            document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
          }

          const ctx = document.getElementById('violationChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Critical', 'Serious', 'Moderate', 'Minor'],
              datasets: [{
                label: 'Violations',
                data: [${violationCounts.critical}, ${violationCounts.serious}, ${violationCounts.moderate}, ${violationCounts.minor}],
                backgroundColor: ['red', 'orange', 'blue', 'green'],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true } }
            }
          });
        </script>
      </body>
    </html>
  `;

  fs.writeFileSync(REPORT_FILE, html);
  console.log(`📄 Report saved to ${REPORT_FILE}`);
};

// ✅ Scan domain
const scanDomain = async (page) => {
  console.log(chalk.cyan(`🌐 Scanning Domain: ${BASE_URL}`));
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page }).analyze();
  formatViolations(results.violations, BASE_URL);
};

// ✅ Scan files under `/src/components`
const scanFiles = async (page) => {
  const files = getAllFiles('./src/components');
  for (const file of files) {
    const url = `${BASE_URL}${file}`;
    try {
      console.log(chalk.cyan(`🔎 Loading URL: ${url}`));
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      formatViolations(results.violations, file);
    } catch (err) {
      console.log(chalk.red(`⚠️ Error loading ${url}: ${err.message}`));
    }
  }
};

// ✅ Test Definition
test('Accessibility Test', async ({ page }) => {
  await scanDomain(page);
  await scanFiles(page);
  generateHTMLReport();
});
