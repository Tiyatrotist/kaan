// Firuze taşı motoru. Hazır bir fotoğraf/doku dosyası YOK: her yüzey kendi tohumundan, kendi boyutunda üretilir.
//  - Her örnek (logo, mesajdaki K, gönder düğmesi…) ayrı tohum → hiçbir yerde aynı taş görünmez.
//  - Kayma/akış yok: damarlar sabittir; yalnızca taşın bulutlu ton alanı çok yavaş "nefes alır" (iki ton alanı arasında geçiş).
//  - Gerçek firuzenin özellikleri: bulutlu mavi-yeşil ton, kireçli soluk bölgeler, dallanan örümcek ağı matris damarı
//    (kahverengi, paslı haleli), ince gözenekler.

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Gradyan gürültüsü (döşenebilir); girdi [0,n) dışına taşarsa sarar; çıktı ≈ [-1,1]. */
function gurultu(n, tohum) {
  const r = mulberry32(tohum);
  const gx = new Float32Array(n * n);
  const gy = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) { const a = r() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % n) + n) % n, y0 = ((yi % n) + n) % n;
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const i00 = y0 * n + x0, i10 = y0 * n + x1, i01 = y1 * n + x0, i11 = y1 * n + x1;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = gx[i00] * xf + gy[i00] * yf;
    const b = gx[i10] * (xf - 1) + gy[i10] * yf;
    const c = gx[i01] * xf + gy[i01] * (yf - 1);
    const d = gx[i11] * (xf - 1) + gy[i11] * (yf - 1);
    const ust = a + (b - a) * u;
    return (ust + (c + (d - c) * u - ust) * v) * 1.4142;
  };
}

/** Hücre (Worley) gürültüsü: hücre sınırına uzaklık (F2−F1); sıfıra yakın = damar çizgisi. */
function ag(n, tohum) {
  const r = mulberry32(tohum);
  const px = new Float32Array(n * n);
  const py = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) { px[i] = 0.1 + r() * 0.8; py[i] = 0.1 + r() * 0.8; }
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx, cy = yi + dy;
        const k = (((cy % n) + n) % n) * n + (((cx % n) + n) % n);
        const fx = cx + px[k] - x, fy = cy + py[k] - y;
        const d = fx * fx + fy * fy;
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
    }
    return Math.sqrt(f2) - Math.sqrt(f1);
  };
}

const kenetle = (a, b, t) => a + (b - a) * t;
const adim = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const RAMPA = [
  [0.0, hex('#0E7676')], [0.38, hex('#1C9C99')], [0.64, hex('#2EB5B2')], [0.84, hex('#52C8C4')], [1.0, hex('#93E0DA')],
];
const MAVI = hex('#2AA9CC');
const YESIL = hex('#2FB391');
const KIREC = hex('#BDE9E3');
const DAMAR = hex('#2A1C13');
const PAS = hex('#7B5A38');
const CUKUR = hex('#1A6E6B');

function rampa(t, c) {
  for (let i = 1; i < RAMPA.length; i++) {
    if (t <= RAMPA[i][0]) {
      const [t0, c0] = RAMPA[i - 1];
      const [t1, c1] = RAMPA[i];
      const k = (t - t0) / (t1 - t0);
      c[0] = kenetle(c0[0], c1[0], k); c[1] = kenetle(c0[1], c1[1], k); c[2] = kenetle(c0[2], c1[2], k);
      return;
    }
  }
  const s = RAMPA[RAMPA.length - 1][1];
  c[0] = s[0]; c[1] = s[1]; c[2] = s[2];
}

/**
 * Bir taş yüzeyi üretir: g×y piksel, `adet` farklı ton alanı (damarlar ortak). Birim: yükseklik (y).
 * birim: taş özelliklerinin ölçeği (görünen yükseklik); kayma payı olan büyük dokularda y'den farklı olabilir.
 * Dönüş: <canvas> dizisi.
 */
export function tasUret({ g, y, tohum, adet = 1, birim = y }) {
  const r = mulberry32(tohum);
  const N = 32;
  const rt = () => (r() * 4294967296) | 0;
  const yeni = () => gurultu(N, rt());
  const ofs = () => r() * 7;

  // ---- Ortak katmanlar: bükme, damar, gözenek, tane
  const gB1 = yeni(), gB2 = yeni(), gKapi1 = yeni(), gKapi2 = yeni(), gKalin = yeni(), gCukur = yeni(), gTane = yeni();
  const ag1 = ag(16, rt()), ag2 = ag(16, rt());
  const o = Array.from({ length: 14 }, ofs);
  const ornek = (gn, f, u, v, i) => gn(o[i] + u * f, o[i + 1] + v * f);

  const n = g * y;
  const damar = new Float32Array(n);
  const pas = new Float32Array(n);
  const cukur = new Float32Array(n);
  const tane = new Float32Array(n);
  const bxA = new Float32Array(n);
  const byA = new Float32Array(n);
  const minW = 1.0 / (0.55 * birim); // en az ~1 piksel kalınlık (hücre biriminde)

  for (let py = 0; py < y; py++) {
    const v0 = py / birim;
    for (let px = 0; px < g; px++) {
      const u0 = px / birim;
      const k = py * g + px;
      const bx = 0.05 * ornek(gB1, 0.9, u0, v0, 0);
      const by = 0.05 * ornek(gB2, 0.9, u0, v0, 2);
      bxA[k] = bx; byA[k] = by;
      const u = u0 + bx, v = v0 + by;
      const kapi1 = adim(0.18, 0.5, 0.5 + 0.6 * ornek(gKapi1, 0.9, u0, v0, 4));
      const kapi2 = adim(0.3, 0.6, 0.5 + 0.6 * ornek(gKapi2, 1.8, u0, v0, 6));
      const kalin = 0.5 + 0.5 * ornek(gKalin, 1.5, u, v, 8);
      const e1 = ag1(o[10] + u * 1.8, o[11] + v * 1.8);
      const e2 = ag2(o[12] + u * 8.5, o[13] + v * 8.5);
      const w1 = Math.max(minW, 0.022 + 0.05 * kalin);
      const d1 = (1 - adim(0, w1, e1)) * kapi1;
      const d2 = (1 - adim(0, Math.max(minW * 0.8, 0.032), e2)) * kapi2 * 0.6;
      damar[k] = Math.min(1, d1 + d2);
      pas[k] = (1 - adim(0, 0.2, e1)) * kapi1 * 0.22;
      cukur[k] = adim(0.62, 0.8, gCukur(o[0] + u0 * 22, o[1] + v0 * 22)) * 0.3;
      tane[k] = 1 + 0.035 * gTane(o[2] + u0 * 70, o[3] + v0 * 70);
    }
  }

  // ---- Ton alanları (her biri farklı bulut düzeni)
  const sonuc = [];
  const c = [0, 0, 0];
  for (let a = 0; a < adet; a++) {
    const gG1 = yeni(), gG2 = yeni(), gG3 = yeni(), gTon = yeni(), gKi1 = yeni(), gKi2 = yeni();
    const q = Array.from({ length: 12 }, ofs);
    const tuval = document.createElement('canvas');
    tuval.width = g;
    tuval.height = y;
    const bag = tuval.getContext('2d');
    const gorsel = bag.createImageData(g, y);
    const veri = gorsel.data;
    for (let py = 0; py < y; py++) {
      const v0 = py / birim;
      for (let px = 0; px < g; px++) {
        const k = py * g + px;
        const u0 = px / birim;
        const u = u0 + bxA[k], v = v0 + byA[k];
        let t = 0.52 + 0.34 * gG1(q[0] + u * 1.0, q[1] + v * 1.0) + 0.2 * gG2(q[2] + u * 2.0, q[3] + v * 2.0) + 0.07 * gG3(q[4] + u * 4.0, q[5] + v * 4.0);
        t = Math.min(1, Math.max(0, t));
        rampa(t, c);
        let [rr, gg, bb] = c;
        const ton = gTon(q[6] + u0 * 0.6, q[7] + v0 * 0.6) * 1.7;
        const hedef = ton > 0 ? MAVI : YESIL;
        const tonK = Math.min(0.55, Math.abs(ton) * 0.5);
        rr = kenetle(rr, hedef[0], tonK); gg = kenetle(gg, hedef[1], tonK); bb = kenetle(bb, hedef[2], tonK);
        const kirec = adim(0.12, 0.78, 0.5 + 0.5 * (0.7 * gKi1(q[8] + u0 * 0.6, q[9] + v0 * 0.6) + 0.3 * gKi2(q[10] + u * 1.4, q[11] + v * 1.4))) * 0.38;
        rr = kenetle(rr, KIREC[0], kirec); gg = kenetle(gg, KIREC[1], kirec); bb = kenetle(bb, KIREC[2], kirec);
        const p = pas[k];
        rr = kenetle(rr, PAS[0], p); gg = kenetle(gg, PAS[1], p); bb = kenetle(bb, PAS[2], p);
        const d = damar[k] * 0.93;
        rr = kenetle(rr, DAMAR[0], d); gg = kenetle(gg, DAMAR[1], d); bb = kenetle(bb, DAMAR[2], d);
        rr = kenetle(rr, CUKUR[0], cukur[k]); gg = kenetle(gg, CUKUR[1], cukur[k]); bb = kenetle(bb, CUKUR[2], cukur[k]);
        const i = k * 4;
        veri[i] = rr * tane[k]; veri[i + 1] = gg * tane[k]; veri[i + 2] = bb * tane[k]; veri[i + 3] = 255;
      }
    }
    bag.putImageData(gorsel, 0, 0);
    sonuc.push(tuval);
  }
  return sonuc;
}

// ---------------------------------------------------------------- Çizim denetleyicisi + ortak zamanlayıcı

const azHareket = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const denetleyiciler = new Set();
let dongu = 0;
const gozlem = 'IntersectionObserver' in window
  ? new IntersectionObserver((kayitlar) => {
    for (const kayit of kayitlar) {
      const k = kayit.target.__tas;
      if (!k) continue;
      const onceki = k.gorunur;
      k.gorunur = kayit.isIntersecting;
      if (k.gorunur && !onceki) k.gorunduNokta();
    }
  })
  : null;
const boyutGozlem = 'ResizeObserver' in window
  ? new ResizeObserver((kayitlar) => kayitlar.forEach((kayit) => kayit.target.__tas?.boyutDegisti()))
  : null;

function uyandir() {
  if (!dongu) dongu = requestAnimationFrame(tik);
}

function tik(t) {
  dongu = 0;
  let devam = false;
  for (const k of denetleyiciler) {
    if (!k.hazir || !k.gorunur || document.hidden) continue;
    const fps = k.fpsAl(t);
    if (fps <= 0) continue;
    devam = true;
    if (t - k.son >= 1000 / fps - 2) { k.son = t; k.ciz(t); }
  }
  if (devam) dongu = requestAnimationFrame(tik);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) uyandir(); });

function temizle() {
  const simdi = performance.now();
  for (const k of denetleyiciler) {
    if (!k.canvas.isConnected && simdi - k.dogum > 3000) {
      gozlem?.unobserve(k.canvas);
      boyutGozlem?.unobserve(k.canvas);
      denetleyiciler.delete(k);
    }
  }
}

/**
 * Taş dolgulu şekil çizen canvas denetleyicisi.
 * o.w/h: tasarım birimi boyutu; o.x0/y0: kutu başlangıcı; o.sekil(ctx, d): maske şeklini çizer (ctx tasarım birimine ölçekli);
 * o.tohum: bu örneğe özgü tohum; o.canli: ton alanı yavaşça nefes alsın; o.giris: harfler tek tek belirsin (d.ilerleme(i));
 * o.durumFps: durum özniteliğine göre ek animasyon (monogram kolları).
 */
export class TasCizimi {
  constructor(canvas, o) {
    this.canvas = canvas;
    this.o = o;
    this.ctx = canvas.getContext('2d');
    this.maske = document.createElement('canvas');
    this.dogum = performance.now();
    this.son = 0;
    this.hazir = false;
    this.gorunur = true;
    this.dokular = [];
    this.girisBasi = null;
    this.faz = ((o.tohum >>> 0) % 6283) / 1000; // aynı tohum → aynı faz: açılıştaki logo ile ana ekrandaki logo birebir aynı görünür
    this.genislik = 0;
    this.boyutZamani = 0;
    canvas.__tas = this;
    canvas.classList.add('tas');
    canvas.style.aspectRatio = `${o.w} / ${o.h}`;
    if (o.rol) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', o.rol); } else canvas.setAttribute('aria-hidden', 'true');
    temizle();
    denetleyiciler.add(this);
    gozlem?.observe(canvas);
    boyutGozlem?.observe(canvas);
    new MutationObserver(() => { this.durumDegisti(); }).observe(canvas, { attributes: true, attributeFilter: ['data-durum'] });
    setTimeout(() => this.hazirla(), o.gecikme ?? 30);
  }

  boyutlar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssG = Math.max(1, Math.round(this.canvas.clientWidth));
    const cssY = Math.max(1, Math.round(cssG * this.o.h / this.o.w));
    return { g: Math.round(cssG * dpr), y: Math.round(cssY * dpr), cssG };
  }

  hazirla() {
    if (!this.canvas.isConnected) { setTimeout(() => this.hazirla(), 120); return; }
    const { g, y, cssG } = this.boyutlar();
    if (cssG < 2) { setTimeout(() => this.hazirla(), 120); return; }
    this.genislik = cssG;
    this.canvas.width = g;
    this.canvas.height = y;
    this.maske.width = g;
    this.maske.height = y;
    // kayma: doku görünen alandan %30 büyük üretilir; çizimde yavaşça gezdirilir (taş ölçeği aynı kalır)
    const pay = this.o.kayma ? 1.3 : 1;
    this.dokular = tasUret({ g: Math.round(g * pay), y: Math.round(y * pay), birim: y, tohum: this.o.tohum, adet: this.o.canli ? 2 : 1 });
    this.pay = [Math.round(g * pay) - g, Math.round(y * pay) - y];
    const ilk = !this.hazir;
    this.hazir = true;
    this.canvas.setAttribute('data-hazir', '');
    if (ilk && this.o.giris && !azHareket()) this.girisBasi = performance.now() + 120;
    this.ciz(performance.now());
    uyandir();
  }

  boyutDegisti() {
    if (!this.hazir) return;
    if (Math.abs(this.canvas.clientWidth - this.genislik) < 2) return;
    clearTimeout(this.boyutZamani);
    this.boyutZamani = setTimeout(() => { this.dokular = []; this.hazirla(); }, 160);
  }

  gorunduNokta() {
    // gizliyken (display:none) yeniden gösterilince giriş animasyonunu baştan oynat
    if (this.hazir && this.o.giris && !azHareket()) this.girisBasi = performance.now() + 60;
    if (this.hazir) { this.ciz(performance.now()); uyandir(); }
  }

  durumDegisti() {
    if (!this.hazir) return;
    this.ciz(performance.now());
    uyandir();
  }

  durum() { return this.canvas.dataset.durum || 'bekle'; }

  fpsAl(t) {
    if (this.girisBasi != null && t - this.girisBasi < 1700) return 60;
    if (azHareket()) return 0;
    const d = this.durum();
    if (this.o.durumFps && (d === 'dusun' || d === 'yaz')) return 60;
    if (this.o.canli) return this.o.kayma ? 30 : 12;
    return 0;
  }

  ciz(t) {
    if (!this.dokular.length) return;
    const { canvas, ctx, o } = this;
    const olcek = canvas.width / o.w;
    // 1) taş: iki ton alanı arasında çok yavaş geçiş (≈ 24 sn'lik döngü)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // yavaş, tekrar etmeyen kayma: x ve y farklı periyotlarla (≈56 sn / ≈82 sn) salınır → döngü gibi görünmez
    let ox = this.pay ? this.pay[0] / 2 : 0;
    let oy = this.pay ? this.pay[1] / 2 : 0;
    if (this.o.kayma && !azHareket()) {
      ox = this.pay[0] * (0.5 + 0.5 * Math.sin(t / 9000 + this.faz));
      oy = this.pay[1] * (0.5 + 0.5 * Math.sin(t / 13000 + this.faz * 1.7));
    }
    ctx.drawImage(this.dokular[0], -ox, -oy);
    if (this.dokular[1] && !azHareket()) {
      ctx.globalAlpha = 0.5 - 0.5 * Math.cos(t / 3800 + this.faz);
      ctx.drawImage(this.dokular[1], -ox, -oy);
      ctx.globalAlpha = 1;
    }
    if (o.acik) { // ortası aydınlık: üstüne simge konan yüzeyler (gönder düğmesi)
      const gr = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.5);
      gr.addColorStop(0, 'rgba(92, 214, 202, 0.7)');
      gr.addColorStop(0.55, 'rgba(92, 214, 202, 0.42)');
      gr.addColorStop(1, 'rgba(92, 214, 202, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // 2) şekil maskesi
    const m = this.maske.getContext('2d');
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, this.maske.width, this.maske.height);
    m.setTransform(olcek, 0, 0, olcek, -o.x0 * olcek, -o.y0 * olcek);
    const gb = this.girisBasi;
    const ilerleme = (i) => {
      if (gb == null || azHareket()) return 1;
      const k = Math.min(1, Math.max(0, (t - gb - i * 110) / 950));
      return k;
    };
    o.sekil(m, { t, durum: this.durum(), ilerleme });
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.maske, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
}
