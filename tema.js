// Tema: sistem / açık / koyu. Elle seçim localStorage'da; geçiş tıklanan noktadan dairesel açılır (destekleniyorsa).
import { azHareket } from './gorunum.js?v=20261015111540';

const ANAHTAR = 'kaan.tema';
const kok = document.documentElement;

export const tercih = () => kok.dataset.tema || 'sistem';
export const etkinTema = () => {
  const t = tercih();
  if (t === 'acik' || t === 'koyu') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'koyu' : 'acik';
};

function yaz(mod) {
  kok.dataset.tema = mod;
  try {
    if (mod === 'sistem') localStorage.removeItem(ANAHTAR);
    else localStorage.setItem(ANAHTAR, mod);
  } catch { /* depolama kapalı */ }
  const renk = document.querySelector('meta[name="theme-color"]');
  if (renk) renk.content = getComputedStyle(kok).getPropertyValue('--zemin');
}

/** mod: 'sistem' | 'acik' | 'koyu'; nokta: {x, y} (ekran koordinatı) — verilirse dairesel açılma. */
export function temaDegistir(mod, nokta) {
  if (mod === tercih()) return;
  if (!document.startViewTransition || azHareket() || !nokta) {
    yaz(mod);
    return;
  }
  const yaricap = Math.hypot(Math.max(nokta.x, innerWidth - nokta.x), Math.max(nokta.y, innerHeight - nokta.y));
  const gecis = document.startViewTransition(() => yaz(mod));
  gecis.ready.then(() => {
    kok.animate(
      { clipPath: [`circle(0px at ${nokta.x}px ${nokta.y}px)`, `circle(${yaricap}px at ${nokta.x}px ${nokta.y}px)`] },
      { duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

export function temaBaslat() {
  yaz(tercih()); // kayıtlı değeri tazele
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => yaz(tercih()));
}
