// Tanıtım sitesi davranışı: logo (taş dolgulu), tema, mobil menü, belirme animasyonu, canlı durum, beta formları.
import { kaanYazisi } from './gorunum.js?v=20261015204540';
import { temaDegistir, etkinTema, temaBaslat } from './tema.js?v=20261015204540';
import { menuAc } from './menu.js?v=20261015204540';

// ---- Ayarlar (yayın aşamasında değişecek)
const UYGULAMA_ADRESI = 'https://kaan.tiyatrotist.com.tr/'; // yayında: uygulamanın tünel/alan adı adresi
const API_KOKU = ''; // canlı durum için API kökü; yayında 'https://<tünel>/v1' (CORS izni gerekir) ya da '' (kapalı)
const BASVURU_ACIK = false; // bekleme listesi açık mı (arka uç hazır olunca true)
const DAVET_ACIK = true; // davet koduyla giriş açık mı (Faz 1)

const $ = (id) => document.getElementById(id);
temaBaslat();

// ---- Logolar
$('marka_yazi')?.append(kaanYazisi({ canli: false }));
$('alt_marka_yazi')?.append(kaanYazisi({ canli: false }));
$('kahraman_logo')?.append(kaanYazisi({ durum: 'gir', kayma: true }));
$('onizleme_logo')?.append(kaanYazisi({ canli: false }));
document.querySelectorAll('[data-uygulama]').forEach((a) => { a.href = UYGULAMA_ADRESI; });

// ---- Tema düğmesi (uygulamadakiyle aynı daire geçişi)
$('tema_dugme')?.addEventListener('click', (o) => {
  const k = o.currentTarget.getBoundingClientRect();
  temaDegistir(etkinTema() === 'koyu' ? 'acik' : 'koyu', { x: k.left + k.width / 2, y: k.top + k.height / 2 });
});

// ---- Mobil menü (uygulamadaki açılır menü bileşeni)
const git = (yol) => () => { location.href = yol; };
$('site_menu')?.addEventListener('click', (o) => {
  menuAc({
    tetik: o.currentTarget, hizala: 'sag', ad: 'Sayfalar',
    ogeler: [
      { ad: 'Ana sayfa', eylem: git('./') },
      { ad: 'Neler yapabilir', eylem: git('sinirlar.html') },
      { ad: 'SSS', eylem: git('sss.html') },
      { ad: 'Durum', eylem: git('durum.html') },
      { ayrac: true },
      { ad: 'Beta’ya katıl', eylem: git('beta.html') },
      { ad: 'Sohbete git', eylem: git(UYGULAMA_ADRESI) },
    ],
  });
});

// ---- Üst çubuk: kaydırınca alt çizgi
const ust = $('site_ust');
const kaydi = () => ust.toggleAttribute('data-kaydi', window.scrollY > 4);
window.addEventListener('scroll', kaydi, { passive: true });
kaydi();

// ---- Kaydırınca belirme (sıralı)
const belirecek = [...document.querySelectorAll('.gizli-basla')];
if ('IntersectionObserver' in window && belirecek.length) {
  const g = new IntersectionObserver((kayitlar) => {
    for (const k of kayitlar) {
      if (!k.isIntersecting) continue;
      k.target.classList.add('gor');
      g.unobserve(k.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  belirecek.forEach((e, i) => { e.style.setProperty('--sira', String(i % 4)); g.observe(e); });
} else {
  belirecek.forEach((e) => e.classList.add('gor'));
}

// ---- Canlı durum (aynı kökende /v1/saglik; yayında başka kökende ise CORS gerekir → ulaşılamazsa gizlenir)
const DURUM_YAZISI = { hazir: 'Kaan şu an hazır', yukleniyor: 'Kaan hazırlanıyor', mesgul: 'Kaan şu an başka bir isteğe cevap veriyor', kapali: 'Kaan şu an kapalı' };

async function durumOku() {
  if (!API_KOKU) return { durum: 'kapali', saglik: null, model: null, bagsiz: true };
  const k = new AbortController();
  const z = setTimeout(() => k.abort(), 6000);
  try {
    const s = await (await fetch(`${API_KOKU}/saglik`, { cache: 'no-store', signal: k.signal })).json();
    const durum = s.durum === 'yukleniyor' ? 'yukleniyor' : s.mesgul ? 'mesgul' : 'hazir';
    let model = null;
    try { model = await (await fetch(`${API_KOKU}/model`, { cache: 'no-store', signal: k.signal })).json(); } catch { /* model bilgisi yoksa sorun değil */ }
    return { durum, saglik: s, model };
  } catch {
    return { durum: 'kapali', saglik: null, model: null };
  } finally {
    clearTimeout(z);
  }
}

const hap = $('durum_hap');
if (hap) {
  durumOku().then((d) => {
    if (d.durum === 'kapali') return; // ana sayfada yanlış alarm vermeyelim
    hap.querySelector('.durum-nokta').dataset.durum = d.durum;
    hap.querySelector('span:last-child').textContent = DURUM_YAZISI[d.durum];
    hap.hidden = false;
  });
}

const kart = $('durum_kart');
if (kart) {
  const yenile = async () => {
    const d = await durumOku();
    kart.querySelector('.durum-nokta').dataset.durum = d.durum;
    kart.querySelector('strong').textContent = d.bagsiz ? 'Henüz bağlı değil' : DURUM_YAZISI[d.durum];
    kart.querySelector('span').textContent = d.bagsiz
      ? 'Canlı durum, sunucu bağlantısı kurulunca burada görünecek.'
      : d.durum === 'kapali'
      ? 'Ulaşılamıyor. Sunucu kapalı ya da bakımda olabilir; birazdan otomatik yeniden denenecek.'
      : 'Son kontrol: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dl = $('durum_ayrinti');
    dl.replaceChildren();
    const satir = (ad, deger) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = ad;
      const dd = document.createElement('dd'); dd.textContent = deger;
      div.append(dt, dd); dl.append(div);
    };
    if (d.model) {
      satir('Model', `${d.model.ad} · ${d.model.surum}`);
      if (d.model.parametre_sayisi) satir('Boyut', `${(d.model.parametre_sayisi / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} milyon parametre`);
      if (d.model.baglam_uzunlugu) satir('Hafıza', `${d.model.baglam_uzunlugu.toLocaleString('tr-TR')} parça`);
    }
    if (d.saglik?.calisma_sn != null) satir('Açık kalma süresi', `${Math.floor(d.saglik.calisma_sn / 3600)} sa ${Math.floor((d.saglik.calisma_sn % 3600) / 60)} dk`);
  };
  yenile();
  setInterval(() => { if (!document.hidden) yenile(); }, 15000);
}

// ---- Beta formları (arka uç hazır olana dek dürüstçe bilgi verir; hiçbir veri toplamaz)
function ileti(kap, metin, tur = '') {
  kap.textContent = metin;
  kap.dataset.tur = tur;
  kap.hidden = false;
}

$('bekleme_form')?.addEventListener('submit', (o) => {
  o.preventDefault();
  const e = $('bekleme_eposta');
  const onay = $('bekleme_onay');
  const kap = $('bekleme_ileti');
  if (!e.validity.valid || !e.value.trim()) { ileti(kap, 'Geçerli bir e-posta adresi yazın.', 'hata'); e.focus(); return; }
  if (!onay.checked) { ileti(kap, 'Devam etmek için aydınlatma metnini okuduğunuzu onaylayın.', 'hata'); onay.focus(); return; }
  if (!BASVURU_ACIK) { ileti(kap, 'Başvurular henüz açılmadı; adresiniz kaydedilmedi. Açılınca bu sayfada duyuracağız.'); return; }
  ileti(kap, 'Teşekkürler. Sıran geldiğinde davet bağlantısı e-postana gelecek.');
});

$('davet_form')?.addEventListener('submit', (o) => {
  o.preventDefault();
  const kod = $('davet_kodu').value.trim();
  const kap = $('davet_ileti');
  if (!kod) { ileti(kap, 'Davet kodunu yazın.', 'hata'); $('davet_kodu').focus(); return; }
  if (!DAVET_ACIK) { ileti(kap, 'Davetli girişi henüz açılmadı. Alfa denemesi başlayınca davet bağlantını buradan kullanabileceksin.'); return; }
  location.href = `${UYGULAMA_ADRESI}?davet=${encodeURIComponent(kod)}`;
});
