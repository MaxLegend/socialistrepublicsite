const jwt = require('jsonwebtoken');
const { getUserById } = require('./database');

const JWT_SECRET = 'socialist-republic-secret-key-2026'; // В продакшене хранить в .env

// Создание JWT токена
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Middleware проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        
        // Получаем актуальные данные пользователя из БД
        const dbUser = await getUserById(user.id);
        if (!dbUser) {
            return res.status(403).json({ error: 'Пользователь не найден' });
        }
        
        req.user = dbUser;
        next();
    });
}

// Middleware проверки роли
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        if (req.user.role !== role && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        
        next();
    };
}

module.exports = {
    generateToken,
    authenticateToken,
    requireRole
};