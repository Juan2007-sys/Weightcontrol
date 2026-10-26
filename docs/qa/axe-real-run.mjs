// Auditoria REAL (sin API simulada) de accesibilidad: axe-core (WCAG2 A/AA + 2.1 + best-practice)
// y Lighthouse (snapshot, solo accesibilidad) sobre login, consulta publica con dato real y las
// vistas autenticadas (TECNICO y ADMIN): dashboard/auditoria, registro, instrumentos, actas,
// administracion (usuarios, trazabilidad, alertas) y calibracion.
//
// Uso (desde una carpeta con node_modules de puppeteer-core, axe-core y lighthouse):
//   node <ruta>/docs/qa/axe-real-run.mjs [salida.json]
// Variables: BASE (def. http://localhost:5173/), API (def. http://localhost:3000/api), SERIAL (opcional),
//   CHROME (ruta a chrome.exe), SKIP_LH=1 para omitir Lighthouse.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const req = createRequire(path.join(process.cwd(), 'x.js'));
const puppeteer = req('puppeteer-core');
const axeSrc = fs.readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
const { startFlow } = await import(pathToUrl(req.resolve('lighthouse')));

function pathToUrl(p) { return 'file:///' + p.replace(/\\/g, '/'); }

const BASE = process.env.BASE || 'http://localhost:5173/';
const API = process.env.API || 'http://localhost:3000/api';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const USERS = {
  TECNICO: { email: 'tecnico@oec-onac.org', password: 'Tecnico123456!' },
  ADMIN: { email: 'admin@weightcontrol.gov.co', password: 'Admin123456!' },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(u) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(u) });
    if (r.status === 429) { await sleep(15000); continue; }
    if (!r.ok) throw new Error('login ' + u.email + ' ' + r.status);
    const j = await r.json();
    return { token: j.accessToken || j.access_token, user: j.user };
  }
  throw new Error('login 429 persistente');
}

const sessions = {};
for (const [rol, u] of Object.entries(USERS)) { sessions[rol] = await login(u); await sleep(1000); }

async function pickSerial() {
  if (process.env.SERIAL) return process.env.SERIAL;
  const r = await fetch(API + '/instrumentos?limit=100', { headers: { authorization: 'Bearer ' + sessions.ADMIN.token } });
  const j = await r.json();
  const items = j.items || j.data || j;
  const prefer = items.find((i) => i.serial === 'QA-BASC-001') || items.find((i) => i.serial && /^(BAL|BAS|DISP|CAM)/.test(i.serial)) || items[0];
  return prefer.serial;
}
const SERIAL = await pickSerial();
console.log('Serial usado para consulta publica:', SERIAL);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const out = {};
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function clickText(page, text, tag = 'button') {
  const [el] = await page.$$(`xpath/.//${tag}[contains(normalize-space(.), "${text}")]`);
  if (!el) throw new Error('no se encontro "' + text + '": ' + (await page.evaluate(() => document.body.innerText.slice(0, 200))));
  await el.click();
  await sleep(1500);
}

async function audit(name, rol, setup) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  if (rol) {
    const s = sessions[rol];
    await page.evaluateOnNewDocument((t, us) => { localStorage.setItem('wc_auth_token', t); localStorage.setItem('wc_auth_user', JSON.stringify(us)); }, s.token, s.user);
  }
  try {
    await setup(page);
    await sleep(800);
    await page.evaluate(axeSrc);
    const res = await page.evaluate(async (tags) => await axe.run(document, { runOnly: { type: 'tag', values: tags } }), AXE_TAGS);
    const entry = {
      rol: rol || 'publico',
      violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 200)) })),
      passes: res.passes.length,
    };
    if (!process.env.SKIP_LH) {
      const flow = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['accessibility'] } } });
      await flow.snapshot({ name });
      const lhr = (await flow.createFlowResult()).steps[0].lhr;
      entry.lighthouseA11y = Math.round(lhr.categories.accessibility.score * 100);
      entry.lighthouseFallos = Object.entries(lhr.audits).filter(([, a]) => a.score === 0).map(([k]) => k);
    }
    out[name] = entry;
  } catch (e) {
    out[name] = { rol: rol || 'publico', error: String(e.message || e).slice(0, 300) };
  }
  await page.close();
}

const home = async (p) => { await p.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(1000); };

await audit('login', null, home);
await audit('consulta-publica-404', null, (p) => p.goto(BASE + '?serial=QA-NOEXISTE-XYZ', { waitUntil: 'networkidle0' }));
await audit('consulta-publica-dato-real', null, async (p) => { await p.goto(BASE + '?serial=' + encodeURIComponent(SERIAL), { waitUntil: 'networkidle0' }); await sleep(2000); });

for (const rol of ['TECNICO', 'ADMIN']) {
  const k = rol.toLowerCase();
  await audit(`${k}-dashboard-auditoria`, rol, home);
  await audit(`${k}-registro`, rol, async (p) => { await home(p); await clickText(p, 'Radicar Inspección'); });
  await audit(`${k}-instrumentos`, rol, async (p) => { await home(p); await clickText(p, 'Mis Instrumentos'); });
  await audit(`${k}-actas-calibraciones`, rol, async (p) => { await home(p); await clickText(p, 'Actas y Ensayos'); });
  await audit(`${k}-consulta-publica-sesion`, rol, async (p) => { await p.goto(BASE + '?serial=' + encodeURIComponent(SERIAL), { waitUntil: 'networkidle0' }); await sleep(2000); });
  if (rol === 'ADMIN') {
    await audit('admin-usuarios', rol, async (p) => { await home(p); await clickText(p, 'Administración del Sistema'); });
    await audit('admin-trazabilidad', rol, async (p) => { await home(p); await clickText(p, 'Administración del Sistema'); await clickText(p, 'Trazabilidad'); });
    await audit('admin-parametros', rol, async (p) => { await home(p); await clickText(p, 'Administración del Sistema'); await clickText(p, 'Parámetros'); });
  }
}

const dest = process.argv[2] || 'axe-real-resultados.json';
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) {
  if (v.error) { console.log(k.padEnd(34), 'ERROR', v.error); continue; }
  console.log(k.padEnd(34), v.rol.padEnd(8), 'axe:', v.violations.length, 'LH a11y:', v.lighthouseA11y ?? '-');
  v.violations.forEach((x) => console.log('   -', x.id, x.impact, x.nodes.length, 'nodos', x.nodes.slice(0, 2).join(' | ')));
}
await browser.close();
