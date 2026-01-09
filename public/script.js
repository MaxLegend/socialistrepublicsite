// script.js

// Галерея скриншотов
document.querySelectorAll('.screenshot').forEach(el => {
  el.addEventListener('click', () => {
    const src = el.getAttribute('data-src');
    const modal = document.getElementById('modal');
    const img = document.getElementById('modal-img');
    // Для демо — подставим заглушку
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23f0e0c0"/><text x="50%" y="50%" font-size="24" fill="%239a2a2a" text-anchor="middle" dominant-baseline="middle">КРУПНЫЙ СКРИНШОТ ИГРЫ</text></svg>';
    modal.classList.add('active');
  });
});

document.getElementById('modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('active');
  }
});

// Подписка
function subscribe() {
  const email = document.getElementById('email')?.value;
  const msg = document.getElementById('msg');
  if (email && email.includes('@')) {
    msg.textContent = "Спасибо! Вы подписаны на обновления.";
    msg.style.color = "#2a9a2a";
    document.getElementById('email').value = '';
  } else {
    msg.textContent = "Пожалуйста, введите корректный email.";
    msg.style.color = "var(--red)";
  }
}

// Закрытие модалки на Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal')?.classList.remove('active');
  }
});