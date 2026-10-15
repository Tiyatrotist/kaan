/* Sayfa çizilmeden önce kayıtlı temayı uygular (ilk karede yanıp sönmeyi önler). Modül değil, klasik betik. */
(function () {
  try {
    var t = localStorage.getItem('kaan.tema');
    if (t === 'acik' || t === 'koyu') document.documentElement.dataset.tema = t;
  } catch (e) { /* depolama kapalıysa sistem teması kalır */ }
})();
