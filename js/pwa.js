(() => {
  if (!('serviceWorker' in navigator)) return;
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isSecure) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('Não foi possível registrar o suporte offline do Los Santos Reader.', error);
    });
  });
})();
