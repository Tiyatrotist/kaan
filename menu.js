// Tek tip açılır menü: efor seçici, sohbet menüsü (başlıktaki ⋯) ve listedeki ⋯ menüsü aynı bileşeni kullanır.
// ogeler: {baslik} | {ayrac:true} | {bilgi:{ad,not}} | {ad, aciklama?, simge?, secili?, tehlike?, onay?, odak?, eylem()}
import { el, simge, azHareket } from './gorunum.js?v=20261015111540';

let acik = null;

export const menuAcikMi = () => acik !== null;

export function menuKapat(odak = false) {
  if (!acik) return;
  const { menu, tetik, temizle } = acik;
  acik = null;
  temizle();
  tetik.setAttribute('aria-expanded', 'false');
  if (azHareket()) menu.remove();
  else { menu.classList.add('kapaniyor'); setTimeout(() => menu.remove(), 150); }
  if (odak) tetik.focus({ preventScroll: true });
}

export function menuAc({ tetik, ogeler, hizala = 'sol', yon = 'asagi', ad = 'Menü' }) {
  if (acik && acik.tetik === tetik) { menuKapat(true); return; }
  menuKapat(false);

  const menu = el('div', { class: 'menu', role: 'menu', 'aria-label': ad });
  const dugmeler = [];
  let sira = 0;
  for (const o of ogeler) {
    if (o.ayrac) { menu.append(el('div', { class: 'menu-ayrac', role: 'separator' })); continue; }
    if (o.baslik) { menu.append(el('div', { class: 'menu-baslik' }, o.baslik)); continue; }
    if (o.bilgi) {
      menu.append(el('div', { class: 'menu-bilgi' }, el('span', { class: 'menu-bilgi-ad' }, o.bilgi.ad), o.bilgi.not ? el('span', { class: 'menu-bilgi-not' }, o.bilgi.not) : null));
      continue;
    }
    const radyo = o.secili !== undefined;
    const baslikEl = el('strong', {}, o.ad);
    const dugme = el('button', {
      type: 'button', role: radyo ? 'menuitemradio' : 'menuitem', 'aria-checked': radyo ? String(Boolean(o.secili)) : null,
      class: `menu-oge${o.tehlike ? ' tehlike' : ''}`, style: `--sira:${sira++}`,
    }, o.simge ? simge(o.simge) : null, el('span', { class: 'menu-metin' }, baslikEl, o.aciklama ? el('small', {}, o.aciklama) : null), radyo ? simge('tik') : null);
    let onayZamani = 0;
    dugme.addEventListener('click', () => {
      if (o.onay && !dugme.hasAttribute('data-onay')) { // yıkıcı eylem: ikinci seçimde uygulanır
        dugme.setAttribute('data-onay', '');
        baslikEl.textContent = o.onay;
        onayZamani = setTimeout(() => { dugme.removeAttribute('data-onay'); baslikEl.textContent = o.ad; }, 3200);
        return;
      }
      clearTimeout(onayZamani);
      menuKapat(o.odak !== false);
      o.eylem();
    });
    menu.append(dugme);
    dugmeler.push(dugme);
  }
  document.body.append(menu);

  // Konum: tetikleyicinin altı/üstü, ekran dışına taşmaz
  const r = tetik.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const bosluk = 8;
  let asagi = yon === 'asagi';
  if (asagi && r.bottom + bosluk + mh > innerHeight - bosluk && r.top - bosluk - mh > bosluk) asagi = false;
  else if (!asagi && r.top - bosluk - mh < bosluk && r.bottom + bosluk + mh <= innerHeight - bosluk) asagi = true;
  const sol = Math.max(bosluk, Math.min(hizala === 'sag' ? r.right - mw : r.left, innerWidth - mw - bosluk));
  const ust = Math.max(bosluk, Math.min(asagi ? r.bottom + bosluk : r.top - bosluk - mh, innerHeight - mh - bosluk));
  menu.style.left = `${sol}px`;
  menu.style.top = `${ust}px`;
  menu.style.transformOrigin = `${hizala === 'sag' ? 'right' : 'left'} ${asagi ? 'top' : 'bottom'}`;

  const disarida = (o) => { if (!menu.contains(o.target) && !tetik.contains(o.target)) menuKapat(false); };
  const tus = (o) => {
    const i = dugmeler.indexOf(document.activeElement);
    if (o.key === 'Escape') { o.preventDefault(); o.stopPropagation(); menuKapat(true); }
    else if (o.key === 'ArrowDown') { o.preventDefault(); dugmeler[(i + 1) % dugmeler.length].focus(); }
    else if (o.key === 'ArrowUp') { o.preventDefault(); dugmeler[(i - 1 + dugmeler.length) % dugmeler.length].focus(); }
    else if (o.key === 'Home') { o.preventDefault(); dugmeler[0].focus(); }
    else if (o.key === 'End') { o.preventDefault(); dugmeler.at(-1).focus(); }
    else if (o.key === 'Tab') menuKapat(false);
  };
  const kapat = () => menuKapat(false);
  document.addEventListener('pointerdown', disarida, true);
  menu.addEventListener('keydown', tus);
  window.addEventListener('resize', kapat);
  window.addEventListener('blur', kapat);
  document.addEventListener('scroll', kapat, true);
  acik = {
    menu, tetik,
    temizle: () => {
      document.removeEventListener('pointerdown', disarida, true);
      window.removeEventListener('resize', kapat);
      window.removeEventListener('blur', kapat);
      document.removeEventListener('scroll', kapat, true);
    },
  };
  tetik.setAttribute('aria-expanded', 'true');
  (dugmeler.find((d) => d.getAttribute('aria-checked') === 'true') || dugmeler[0])?.focus({ preventScroll: true });
}
