// Recorrido por teclado (Tab / Shift+Tab / Enter / Esc) en login, registro, consulta publica y modales.
// Uso: node docs/qa/teclado-run.mjs  (desde una carpeta con puppeteer-core). Reporta: nº de paradas de Tab,
// elementos con foco sin indicador visible, trampas (el foco no avanza) y si Esc cierra los modales.
import { createRequire } from 'module';
import path from 'path';
const req = createRequire(path.join(process.cwd(), 'x.js'));
const puppeteer = req('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:5173/';
const API = process.env.API || 'http://localhost:3000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });

const desc = () => { const e = document.activeElement; if (!e || e === document.body) return 'BODY'; const cs = getComputedStyle(e); const vis = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' || cs.borderColor !== ''; return `${e.tagName}#${e.id || ''}.${(e.getAttribute('aria-label') || e.innerText || e.name || '').slice(0, 30).replace(/\s+/g, ' ')}|outline:${cs.outlineStyle}/${cs.outlineWidth}`; };

async function tabWalk(page, name, max = 150) {
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const seen = []; let trapped = false, noOutline = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(desc);
    if (d === 'BODY') { seen.push('BODY'); if (seen.length > 1 && seen[seen.length - 2] === 'BODY') { trapped = true; break; } if (i > 3) break; continue; }
    if (seen.length && seen[seen.length - 1] === d) { trapped = true; break; }
    if (/outline:none/.test(d)) noOutline.push(d);
    seen.push(d);
  }
  // Shift+Tab vuelve atras
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  console.log(`${name}: ${seen.filter((x) => x !== 'BODY').length} paradas de Tab; trampa=${trapped}; sin outline visible=${noOutline.length}`);
  noOutline.slice(0, 5).forEach((x) => console.log('   sin outline:', x));
}

const login = async (email, password) => { const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); const j = await r.json(); return { token: j.accessToken || j.access_token, user: j.user }; };

let page = await browser.newPage(); await page.setViewport({ width: 1366, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
const [ing] = await page.$$('xpath/.//button[contains(., "Ingreso Institucional")]'); await ing.focus(); await page.keyboard.press('Enter'); await sleep(1200);
await tabWalk(page, 'login');
// Login solo con teclado
await page.evaluate(() => document.querySelector('#auth-email')?.focus());
await page.keyboard.type('tecnico@oec-onac.org'); await page.keyboard.press('Tab'); await page.keyboard.type('Tecnico123456!'); await page.keyboard.press('Enter');
await sleep(2500);
console.log('login por teclado (Enter) ->', await page.evaluate(() => document.body.innerText.includes('Salir') ? 'sesion iniciada' : 'sin sesion: ' + document.body.innerText.slice(0, 80)));
await page.close();

const s = await login('tecnico@oec-onac.org', 'Tecnico123456!');
page = await browser.newPage(); await page.setViewport({ width: 1366, height: 900 });
await page.evaluateOnNewDocument((t, u) => { localStorage.setItem('wc_auth_token', t); localStorage.setItem('wc_auth_user', JSON.stringify(u)); }, s.token, s.user);
await page.goto(BASE, { waitUntil: 'networkidle0' });
const [b] = await page.$$('xpath/.//button[contains(., "Radicar Inspección")]'); await b.click(); await sleep(1500);
await tabWalk(page, 'registro');
// Fase 2 con teclado (div role=button)
await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find((e) => /FASE 02/.test(e.innerText))?.focus());
await page.keyboard.press('Enter'); await sleep(500);
console.log('registro: Enter sobre la fase 2 ->', await page.evaluate(() => /ESTABLECIMIENTO|Establecimiento/.test(document.body.innerText) ? 'ok' : '?'));
await page.close();

page = await browser.newPage(); await page.setViewport({ width: 1366, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
const [pub] = await page.$$('xpath/.//button[contains(., "Consulta Pública")]'); await pub.click(); await sleep(1200);
await tabWalk(page, 'consulta-publica');
const [qr] = await page.$$('xpath/.//button[contains(., "Escanear con")]');
if (qr) {
  await qr.focus(); await page.keyboard.press('Enter'); await sleep(1200);
  const open = await page.evaluate(() => !!document.querySelector('[role=dialog]'));
  const inside = await page.evaluate(() => document.querySelector('[role=dialog]')?.contains(document.activeElement));
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const stillInside = await page.evaluate(() => document.querySelector('[role=dialog]')?.contains(document.activeElement));
  await page.keyboard.press('Escape'); await sleep(600);
  const closed = await page.evaluate(() => !document.querySelector('[role=dialog]'));
  const back = await page.evaluate(() => document.activeElement?.innerText?.slice(0, 30));
  console.log(`QrScannerModal: abre=${open}; foco dentro=${inside}; tras 12 Tab sigue dentro=${stillInside}; Esc cierra=${closed}; foco vuelve a="${back}"`);
} else console.log('QrScannerModal: boton no encontrado');
await browser.close();
