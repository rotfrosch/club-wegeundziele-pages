(() => {
  const notice = document.createElement('div');
  notice.id = 'readinessNotice';
  notice.setAttribute('role', 'alert');
  notice.style.cssText = 'position:relative;z-index:10000;padding:18px;background:#fff3cd;color:#332600;font:16px/1.5 sans-serif';
  notice.textContent = 'Der Mitgliederbereich wird geladen …';
  document.body.prepend(notice);
  const fail = () => {
    notice.hidden = false;
    notice.textContent = 'Der Mitgliederbereich konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und lade die Seite erneut. Anmeldung und Berechtigungen sind derzeit nicht verfügbar.';
    document.documentElement.classList.remove('club-auth-pending');
    const content = document.querySelector('.wrap');
    if (content) content.hidden = true;
  };
  const timer = setTimeout(fail, 15000);
  window.portalReady = {
    fail() { clearTimeout(timer); fail(); },
    done() { clearTimeout(timer); notice.hidden = true; },
    async loadAuth() {
      return Promise.race([
        import('./auth.js'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ladezeit überschritten')), 12000))
      ]);
    }
  };
})();
