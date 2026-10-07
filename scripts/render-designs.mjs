/**
 * Renders the approved designs (design/*.dc.html) to 390×844 PNGs that the
 * Playwright visual check compares the app against.
 *
 * The design files need a runtime that isn't in the kit, so this fills in
 * their templates itself: {{holes}}, <sc-if>, <sc-for>, and each file's
 * DCLogic class (renderVals) for the sample data.
 *
 *   node scripts/render-designs.mjs        → tests/visual/ref/*.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const designDir = path.join(root, 'design');
const outDir = path.join(root, 'tests/visual/ref');
const tmpDir = path.join(root, 'test-results/design-html');

/** name → design file and the component state to render. */
export const VARIANTS = {
  SignIn: { file: 'SignIn', state: {} },
  'SignIn-role': { file: 'SignIn', state: { step: 'role' } },
  Setup: { file: 'Setup', state: {} },
  Main: { file: 'Main', state: {} },
  Week: { file: 'Week', state: {} },
  Log: { file: 'Log', state: {} },
  Eatery: { file: 'Eatery', state: {} },
  'Eatery-menu': { file: 'Eatery', state: { view: 'menu' } },
  Pot: { file: 'Pot', state: {} },
  Business: { file: 'Business', state: {} },
  Prices: { file: 'Prices', state: {} },
};

function evaluate(expr, scope) {
  const keys = Object.keys(scope).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k));
  return new Function(...keys, `return (${expr});`)(...keys.map((k) => scope[k]));
}

function fill(html, scope) {
  return html
    .replace(/\s(on[A-Z]\w*)="\{\{[^}]*\}\}"/g, '')
    .replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_m, expr) => {
      const v = evaluate(expr, scope);
      return v === undefined || v === null ? '' : String(v);
    });
}

function expand(html, scope) {
  // sc-if blocks (not nested in each other in these files)
  html = html.replace(/<sc-if value="\{\{([\s\S]*?)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, (_m, expr, body) =>
    evaluate(expr, scope) ? body : '',
  );
  // sc-for blocks
  html = html.replace(/<sc-for list="\{\{([\s\S]*?)\}\}" as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g, (_m, expr, as, body) =>
    (evaluate(expr, scope) ?? []).map((item) => fill(body, { ...scope, [as]: item })).join(''),
  );
  return fill(html, scope);
}

export function renderDesign(file, state) {
  const src = fs.readFileSync(path.join(designDir, `${file}.dc.html`), 'utf8');
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(src)?.[1] ?? '';
  const body = /<x-dc>([\s\S]*?)<\/x-dc>/.exec(src)[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const script = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(src)[1];
  const DCLogic = class {
    constructor(props) {
      this.props = props ?? {};
      this.state = {};
    }
    setState(patch) {
      Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    }
  };
  const Component = new Function('DCLogic', `${script}\nreturn Component;`)(DCLogic);
  const c = new Component({});
  Object.assign(c.state, state);
  const vals = c.renderVals();
  const designUrl = 'file:///' + designDir.replace(/\\/g, '/') + '/';
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${designUrl}">${helmet}</head><body>${expand(body, vals)}</body></html>`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  for (const [name, { file, state }] of Object.entries(VARIANTS)) {
    const htmlPath = path.join(tmpDir, `${name}.html`);
    fs.writeFileSync(htmlPath, renderDesign(file, state));
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log('rendered', name);
  }
  await browser.close();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  await main();
}
