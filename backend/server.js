
const express = require('express');
const path = require('path');
const cors = require('cors');
const { 
    initDatabase, 
    getAllPosts, 
    getPostById, 
    createPost, 
    updatePost, 
    deletePost,
    createUser,
    getUserByUsername,
    getUserById,
    verifyPassword
} = require('./database');

const { 
    generateToken, 
    authenticateToken, 
    requireRole 
} = require('./auth');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// ================== АУТЕНТИФИКАЦИЯ ==================

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        console.log('Register request:', req.body);
        const { username, password, email } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
        }
        
        // Проверяем, существует ли пользователь
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const userId = await createUser(username, password, email);
        const user = await getUserByUsername(username);
        
        // Убираем пароль из ответа
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        };
        
        const token = generateToken(userResponse);
        
        res.json({ 
            message: 'Регистрация успешна', 
            user: userResponse, 
            token 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    try {
        console.log('Login request:', req.body);
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }
        
        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        // Создаем объект пользователя без пароля
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        };
        
        const token = generateToken(userResponse);
        
        res.json({ 
            message: 'Вход выполнен', 
            user: userResponse, 
            token 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение информации о текущем пользователе
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================== БЛОГ ==================

// Получение всех постов (доступно всем)
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await getAllPosts();
        res.json(posts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение одного поста
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await getPostById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание поста (только админ)
app.post('/api/posts', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Заголовок и содержание обязательны' });
        }
        
        const id = await createPost(title, content, req.user.username, req.user.id);
        res.json({ id, message: 'Пост создан успешно' });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Редактирование поста
app.put('/api/posts/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        await updatePost(req.params.id, title, content);
        res.json({ message: 'Пост обновлён' });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление поста
app.delete('/api/posts/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await deletePost(req.params.id);
        res.json({ message: 'Пост удалён' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================== СТРАНИЦЫ ==================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/blog.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/blog.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Обслуживаем любые другие HTML файлы
app.get('*.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', req.path));
});

// Обслуживаем статические файлы (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, '../public')));

// Обработка 404
app.use((req, res) => {
    res.status(404).send('Страница не найдена');
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Start server
app.listen(PORT, async () => {
    await initDatabase();
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📝 Blog: http://localhost:${PORT}/blog.html`);
    console.log(`🔑 Login: http://localhost:${PORT}/login.html`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin.html`);
    console.log(`🔐 Admin account: admin / admin123`);
});
