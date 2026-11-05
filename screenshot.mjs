import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUT = './screenshots';
mkdirSync(OUT, { recursive: true });

const TABS = [
  { id: 'form', label: '01-form', name: 'Dynamic Form Engine' },
  { id: 'grid', label: '02-grid', name: 'High-Volume Data Grid' },
  { id: 'conflict', label: '03-conflict', name: 'Conflict Resolution' },
  { id: 'identity', label: '04-identity', name: 'Identity Workspace' },
  { id: 'upload', label: '05-upload', name: 'Resumable Upload' },
  { id: 'workflow', label: '06-workflow', name: 'Workflow Builder' },
];

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Helper: navigate to a tab by clicking sidebar button containing the tab name
  async function goToTab(tabName) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await wait(500);
    // Click the sidebar nav button matching the tab
    const btn = page.locator(`button:has-text("${tabName}")`).first();
    await btn.click();
    await wait(800);
  }

  // ── 01: Dynamic Form Engine ────────────────────────────────────────────────
  console.log('Screenshotting: Dynamic Form Engine');
  await goToTab('Dynamic Form Engine');

  // Trigger validation errors by submitting empty form
  await page.click('button:has-text("Submit Request")');
  await wait(400);
  await page.screenshot({ path: `${OUT}/01-form-validation-errors.png`, fullPage: false });

  // Fill form partially then select manufacturer to show conditional section
  await page.selectOption('select', { label: 'Manufacturer' }); // vendorType
  await wait(300);
  await page.screenshot({ path: `${OUT}/01-form-conditional-section.png`, fullPage: false });

  // View implementation
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/01-form-code.png`, fullPage: false });

  // ── 02: Data Grid ─────────────────────────────────────────────────────────
  console.log('Screenshotting: Data Grid');
  await goToTab('High-Volume Data Grid');
  await wait(400);
  await page.screenshot({ path: `${OUT}/02-grid-default.png`, fullPage: false });

  // Search and filter
  await page.fill('input[placeholder*="Search"]', 'Sarah');
  await wait(300);
  await page.screenshot({ path: `${OUT}/02-grid-search.png`, fullPage: false });

  // View code
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/02-grid-code.png`, fullPage: false });

  // ── 03: Conflict Resolution ───────────────────────────────────────────────
  console.log('Screenshotting: Conflict Resolution');
  await goToTab('Conflict Resolution');
  await wait(400);

  // Start editing — will trigger concurrent edit after 1.5s
  await page.click('button:has-text("Start Editing")');
  await wait(2500); // wait for User B's concurrent edit to register

  // Attempt save — should get conflict
  await page.click('button:has-text("Save Changes")');
  await wait(600);
  await page.screenshot({ path: `${OUT}/03-conflict-detected.png`, fullPage: false });

  // View code
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/03-conflict-code.png`, fullPage: false });

  // ── 04: Identity Workspace ────────────────────────────────────────────────
  console.log('Screenshotting: Identity Workspace');
  await goToTab('Identity & Permissions');
  await wait(400);
  await page.screenshot({ path: `${OUT}/04-identity-default.png`, fullPage: false });

  // Click a denied action (find a locked action)
  // The viewer org has minimal permissions - switch to it
  await page.click('button:has-text("Northridge Capital")');
  await wait(300);
  // click last org (Axiom Retail - viewer)
  const axiomBtn = page.locator('button:has-text("Axiom Retail Group")');
  if (await axiomBtn.count() > 0) {
    await axiomBtn.click();
    await wait(300);
  }
  // Click a denied action
  const deniedBtn = page.locator('button').filter({ hasText: 'Create contract' }).first();
  if (await deniedBtn.count() > 0) {
    await deniedBtn.click();
    await wait(400);
  }
  await page.screenshot({ path: `${OUT}/04-identity-denied.png`, fullPage: false });

  // View code
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/04-identity-code.png`, fullPage: false });

  // ── 05: Resumable Upload ──────────────────────────────────────────────────
  console.log('Screenshotting: Resumable Upload');
  await goToTab('Resumable Uploads');
  await wait(400);

  // Start all uploads
  await page.click('button:has-text("Start all queued")');
  await wait(1200);
  await page.screenshot({ path: `${OUT}/05-upload-progress.png`, fullPage: false });

  // Pause first file if it's uploading
  const pauseBtn = page.locator('button[title]').first();
  const pauseBtns = page.locator('svg').filter({ hasText: '' }); // look for pause icons
  // Actually find by clicking the pause button (Pause icon)
  await wait(800);
  await page.screenshot({ path: `${OUT}/05-upload-in-progress.png`, fullPage: false });

  // View code
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/05-upload-code.png`, fullPage: false });

  // ── 06: Workflow Builder ──────────────────────────────────────────────────
  console.log('Screenshotting: Workflow Builder');
  await goToTab('Workflow Builder');
  await wait(400);
  await page.screenshot({ path: `${OUT}/06-workflow-default.png`, fullPage: false });

  // Try to publish to show validation errors (add a condition node with only 1 outgoing edge issue)
  // First delete a required edge by clicking on canvas then add a disconnected node
  await page.click('button:has-text("Condition")'); // Add new condition node
  await wait(300);
  // Publish to see validation errors
  await page.click('button:has-text("Validate & Publish")');
  await wait(400);
  await page.screenshot({ path: `${OUT}/06-workflow-validation.png`, fullPage: false });

  // Try to create a circular connection - click a node to select it
  // First undo the extra node
  await page.click('button[title]', { position: { x: 10, y: 10 } }).catch(() => {});
  // Use keyboard undo shortcut — let's just click undo button (the one with RotateCcw)
  // Both undo buttons look similar - click first one in the toolbar
  const undoBtns = page.locator('button:has(.lucide-rotate-ccw), button svg.lucide-rotate-ccw').first();
  await page.locator('button').nth(0).click().catch(() => {}); // fallback

  // View code
  await page.click('button:has-text("View implementation")');
  await wait(300);
  await page.screenshot({ path: `${OUT}/06-workflow-code.png`, fullPage: false });

  // ── Full app screenshot ────────────────────────────────────────────────────
  await goToTab('Dynamic Form Engine');
  await wait(300);
  await page.screenshot({ path: `${OUT}/00-app-overview.png`, fullPage: false });

  await browser.close();

  // Write index
  const { writeFileSync } = await import('fs');
  const files = [
    '00-app-overview.png - Full application with sidebar navigation',
    '01-form-validation-errors.png - Form validation errors triggered',
    '01-form-conditional-section.png - Conditional section revealed (Manufacturer)',
    '01-form-code.png - Form engine implementation code panel',
    '02-grid-default.png - Data grid with 1000 rows virtual scroll',
    '02-grid-search.png - Grid filtered by search term',
    '02-grid-code.png - Virtual scroll implementation code',
    '03-conflict-detected.png - ETag conflict detected split-pane view',
    '03-conflict-code.png - Conflict resolution implementation code',
    '04-identity-default.png - Identity workspace with RBAC actions',
    '04-identity-denied.png - Denied action toast for low-privilege role',
    '04-identity-code.png - RBAC permission matrix implementation',
    '05-upload-progress.png - Chunked upload in progress',
    '05-upload-in-progress.png - Upload with progress bars',
    '05-upload-code.png - Resumable upload implementation',
    '06-workflow-default.png - Workflow builder canvas with nodes',
    '06-workflow-validation.png - Publish validation errors shown',
    '06-workflow-code.png - Cycle detection implementation',
  ];
  writeFileSync(`${OUT}/index.txt`, files.join('\n'));
  console.log('Done! Screenshots saved to ./screenshots/');
  console.log(files.join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
