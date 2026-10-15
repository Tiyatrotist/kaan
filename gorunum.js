// Küçük DOM yardımcıları: öğe oluşturma, simge, Kaan yazısı/işareti (taş dolgulu canvas), hareket tercihi, beklemeler.
import { TasCizimi } from './tas.js?v=20261015134241';

const SVG_AD = 'http://www.w3.org/2000/svg';

/** el('div', {class:'a', veri:{x:1}, onclick:fn}, çocuklar...) — metinler daima textContent olarak eklenir. */
export function el(etiket, ozellik = {}, ...cocuklar) {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'veri') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  e.append(...cocuklar.flat().filter((c) => c != null && c !== false));
  return e;
}

function svgOge(etiket, ozellik = {}) {
  const e = document.createElementNS(SVG_AD, etiket);
  for (const [k, v] of Object.entries(ozellik)) e.setAttribute(k, v);
  return e;
}

/** Simge takımından (index.html) bir simge. */
export function simge(ad) {
  const s = svgOge('svg', { class: 'simge', 'aria-hidden': 'true' });
  s.append(svgOge('use', { href: `#i-${ad}` }));
  return s;
}

// ---------------------------------------------------------------- Kaan yazısı ve K simgesi (taş dolgulu canvas)
// Harfler hazır bir yazı tipi değil, elle çizilmiş çokgenlerdir: "kesik taş" köşeleri, elmas iç boşluklu a, sivri omuzlu n.
// Dolgu tas.js'in ürettiği firuze taşıdır; her örnek kendi tohumundan üretildiği için hiçbir yerde aynı taş görünmez.

const nok = (s) => s.split(' ').map((p) => p.split(',').map(Number));
const K_GOVDE = nok('0,9 9,0 24,0 24,100 9,100 0,91');
const K_KOL_UST = nok('56,0 86,0 24,82.7 24,42.7');
const K_KOL_ALT = nok('24,57.3 56,100 88,100 49.5,48.7');
const A_SEKIL = nok('22,38 48,38 66,56 66,82 48,100 22,100 4,82 4,56');
const A_SAP = nok('48,38 61,38 70,47 70,100 48,100');
const A_ELMAS = nok('31,56 44,69 31,82 18,69');
const N_YOL = new Path2D('M11 100V67L29 49H41L59 67V100');
const PIVOT = [24, 62];

const kenetle = (a, b, t) => a + (b - a) * t;
const geriYay = (t) => { const c1 = 1.9; const c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };

/** Çokgenleri TEK yolda birleştirir (aynı yönde): ayrı ayrı doldurulunca kenarlarda oluşan ince çizgi (diş) olmaz. */
function yonlu(nokta) {
  let alan = 0;
  nokta.forEach(([x1, y1], i) => { const [x2, y2] = nokta[(i + 1) % nokta.length]; alan += x1 * y2 - x2 * y1; });
  return alan < 0 ? [...nokta].reverse() : nokta;
}

function birlesikDoldur(ctx, listeler) {
  ctx.beginPath();
  for (const l of listeler) {
    yonlu(l).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.fill('nonzero');
}

function don(nokta, aci) {
  if (!aci) return nokta;
  const r = (aci * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return nokta.map(([x, y]) => [PIVOT[0] + (x - PIVOT[0]) * c - (y - PIVOT[1]) * s, PIVOT[1] + (x - PIVOT[0]) * s + (y - PIVOT[1]) * c]);
}

function kolluK(ctx, ust = 0, alt = 0) {
  // Kollar gövdeye 1,5 birim girer (döndüklerinde de bağlantı kopmaz); hepsi tek yol
  const ustKol = K_KOL_UST.map(([x, y]) => [x === 24 ? 22.5 : x, y]);
  const altKol = K_KOL_ALT.map(([x, y]) => [x === 24 ? 22.5 : x, y]);
  birlesikDoldur(ctx, [K_GOVDE, don(ustKol, ust), don(altKol, alt)]);
}

function harfA(ctx) {
  birlesikDoldur(ctx, [A_SEKIL, A_SAP]);
  ctx.globalCompositeOperation = 'destination-out'; // elmas iç boşluk
  birlesikDoldur(ctx, [A_ELMAS]);
  ctx.globalCompositeOperation = 'source-over';
}

function harfN(ctx) {
  ctx.lineWidth = 22;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.stroke(N_YOL);
}

/** Harfi, giriş ilerlemesine göre aşağıdan yükselterek (yay etkisiyle) çizer. */
function girisliHarf(ctx, p, kayma, ciz) {
  if (p <= 0) return;
  const e = geriYay(p);
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 1.8);
  ctx.translate(kayma + 35, 100 + (1 - e) * 44);
  const o = kenetle(0.84, 1, Math.min(1, e));
  ctx.scale(o, o);
  ctx.translate(-35, -100);
  ciz(ctx);
  ctx.restore();
}

function yaziSekli(ctx, d) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  girisliHarf(ctx, d.ilerleme(0), 0, (c) => kolluK(c));
  girisliHarf(ctx, d.ilerleme(1), 96, harfA);
  girisliHarf(ctx, d.ilerleme(2), 174, harfA);
  girisliHarf(ctx, d.ilerleme(3), 252, harfN);
}

function kSekli(ctx, d) {
  ctx.fillStyle = '#fff';
  let ust = 0;
  let alt = 0;
  if (d.durum === 'dusun') { const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * d.t) / 1600); ust = -3 - 9 * k; alt = 3 + 9 * k; }
  else if (d.durum === 'yaz') { const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * d.t) / 800); ust = -15 * k; alt = 15 * k; }
  else if (d.durum === 'hata') { ust = -16; alt = 16; }
  kolluK(ctx, ust, alt);
}

export const rastgeleTohum = () => (Math.random() * 4294967296) >>> 0;

/** Tohumdan sabit sayı: aynı kimlik her zaman aynı taşı verir (mesajdaki K, sayfa yenilense de değişmez). */
export function tohumdan(metin) {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) { h ^= metin.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Tam "Kaan" yazısı. durum: bekle | gir (harfler tek tek yükselir). */
export function kaanYazisi({ durum = 'bekle', canli = true, kayma = false, giris = durum === 'gir', tohum = rastgeleTohum() } = {}) {
  const c = document.createElement('canvas');
  c.className = 'kaan-yazi';
  c.dataset.durum = durum;
  new TasCizimi(c, { w: 332, h: 112, x0: -4, y0: -6, sekil: yaziSekli, tohum, canli, kayma, giris, rol: 'Kaan' });
  return c;
}

/** Tek harflik "K" simgesi (sohbette Kaan'ın etiketi). durum: bekle | dusun | yaz | hata */
export function isaret(boyut = 18, durum = 'bekle', tohum = rastgeleTohum()) {
  const c = document.createElement('canvas');
  c.className = 'isaret';
  c.dataset.durum = durum;
  c.style.height = `${boyut / 16}rem`;
  new TasCizimi(c, { w: 100, h: 112, x0: -6, y0: -6, sekil: kSekli, tohum, canli: false, durumFps: true, gecikme: 10 });
  return c;
}

/** Düz taş yüzey (ör. gönder düğmesinin zemini): canvas'ı tüm alanıyla taşla doldurur. */
export function tasYuzey(canvas, { tohum = rastgeleTohum(), acik = true } = {}) {
  new TasCizimi(canvas, {
    w: 100, h: 100, x0: 0, y0: 0, tohum, acik, canli: true, kayma: true,
    sekil: (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 100, 100); },
  });
}

export const azHareket = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** İptal edilebilir bekleme; sinyal iptal edilirse AbortError ile reddeder. */
export function bekle(ms, sinyal) {
  return new Promise((coz, red) => {
    if (sinyal?.aborted) return red(new DOMException('Durduruldu', 'AbortError'));
    const kapat = () => { clearTimeout(t); red(new DOMException('Durduruldu', 'AbortError')); };
    const t = setTimeout(() => { sinyal?.removeEventListener('abort', kapat); coz(); }, ms);
    sinyal?.addEventListener('abort', kapat, { once: true });
  });
}

/** CSS animasyonunu baştan oynat. */
export function yenidenOynat(e, sinif) {
  e.classList.remove(sinif);
  void e.offsetWidth;
  e.classList.add(sinif);
}
