// auth-ui.js
document.addEventListener('DOMContentLoaded', function() {
    updateAuthUI();
    
    // Кнопка выхода
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-logout')) {
            e.preventDefault();
            logout();
        }
    });
});

// Проверка авторизации и обновление UI
function updateAuthUI() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;
    
    // Очищаем содержимое
    authButtons.innerHTML = '';
    
    if (token && user.username) {
        // Пользователь авторизован
        authButtons.innerHTML = `
            <div class="user-info">
                <span class="username">${escapeHtml(user.username)}</span>
                <span class="user-role">${escapeHtml(user.role)}</span>
            </div>
            <a href="#" class="nav-auth nav-logout">Выйти</a>
        `;
    } else {
        // Пользователь не авторизован
        authButtons.innerHTML = `
            <a href="login.html" class="nav-auth">Вход</a>
            <a href="login.html#register" class="nav-auth">Регистрация</a>
        `;
    }
}

// Выход из системы
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    
    // Редирект на главную, если не на ней
    if (window.location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
    }
    
    // Можно показать уведомление
    showNotification('Вы успешно вышли из системы', 'success');
}

// Проверка валидности токена на сервере
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            return true;
        } else {
            // Токен невалиден
            logout();
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Функция для безопасного отображения текста
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Уведомления (опционально)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#2e7d32' : '#9a2a2a'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Проверяем авторизацию при загрузке каждой страницы
checkAuth().then(isAuthenticated => {
    if (isAuthenticated) {
        updateAuthUI();
    }
});