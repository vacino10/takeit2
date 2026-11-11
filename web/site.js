(() => {
// givo – jednoduchý skript pro landing page (bez knihoven)
const SUPABASE_URL = 'https://zkhezjbvmefyqfcuytjz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n2Xnv9QOjMrtOhtXwhfhCg_y_jUvyX9'; // veřejný (publishable) klíč – smí být na webu

// Hlavička s linkou po scrollu
const header = document.querySelector('.top');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Čekací listina – uloží e-mail do Supabase tabulky `waitlist`
document.querySelectorAll('form.wl').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type=email]');
    const btn = form.querySelector('button');
    const email = (input.value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.focus();
      input.setCustomValidity('Zadej platný e-mail');
      input.reportValidity();
      input.setCustomValidity('');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Odesílám…';
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email, source: form.dataset.source || 'web' }),
      });
      // 409 = e-mail už na seznamu je → bereme jako úspěch
      if (!res.ok && res.status !== 409) throw new Error(String(res.status));
      form.classList.add('done');
      const ok = form.parentElement.querySelector('.wl-ok');
      if (ok) ok.classList.add('show');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Zkusit znovu';
      alert('Nepodařilo se odeslat. Zkus to prosím za chvíli znovu.');
    }
  });
});

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

})();
