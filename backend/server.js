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
    verifyPassword,
    getCommentsByPostId,
    createComment,
    deleteComment,
    getCommentById
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
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
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

// Выход (клиентская операция, но можно добавить endpoint для инвалидации токена)
app.post('/api/logout', authenticateToken, (req, res) => {
    try {
        // В реальном приложении здесь можно добавить инвалидацию токена
        // Пока просто отвечаем успехом, так как JWT stateless
        res.json({ message: 'Выход выполнен' });
    } catch (error) {
        console.error('Logout error:', error);
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
        res.status(500).json({ error: 'Ошибка при получении постов' });
    }
});

// Получение одного поста
app.get('/api/posts/:id', async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Неверный ID поста' });
        }
        
        const post = await getPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Ошибка при получении поста' });
    }
});

// Создание поста (только админ)
app.post('/api/posts', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        console.log('Creating post with data:', req.body);
        console.log('User creating post:', req.user);
        
        const { title, content } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Заголовок обязателен' });
        }
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Содержание обязательно' });
        }
        
        if (title.trim().length < 3) {
            return res.status(400).json({ error: 'Заголовок слишком короткий' });
        }
        
        if (content.trim().length < 10) {
            return res.status(400).json({ error: 'Содержание слишком короткое' });
        }
        
        // Используем username из токена как автора
        const author = req.user.username;
        const userId = req.user.id;
        
        console.log('Creating post with:', { title: title.trim(), content: content.trim(), author, userId });
        
        const id = await createPost(title.trim(), content.trim(), author, userId);
        
        console.log('✅ Post created with ID:', id);
        
        res.status(201).json({ 
            id, 
            message: 'Пост создан успешно',
            post: {
                id,
                title: title.trim(),
                author,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Create post error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Ошибка при создании поста: ' + error.message });
    }
});

// Редактирование поста (только админ)
app.put('/api/posts/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Неверный ID поста' });
        }
        
        const { title, content } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Заголовок обязателен' });
        }
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Содержание обязательно' });
        }
        
        // Проверяем, существует ли пост
        const existingPost = await getPostById(postId);
        if (!existingPost) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        
        await updatePost(postId, title.trim(), content.trim());
        res.json({ 
            message: 'Пост обновлён',
            post: {
                id: postId,
                title: title.trim(),
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении поста' });
    }
});

// Удаление поста (только админ)
app.delete('/api/posts/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Неверный ID поста' });
        }
        
        // Проверяем, существует ли пост
        const existingPost = await getPostById(postId);
        if (!existingPost) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        
        await deletePost(postId);
        res.json({ 
            message: 'Пост удалён',
            deletedId: postId
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Ошибка при удалении поста' });
    }
});
// ================== КОММЕНТАРИИ ==================

// Получить комментарии для поста (доступно всем)
app.get('/api/posts/:id/comments', async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Неверный ID поста' });
        }
        
        // Проверяем, существует ли пост
        const post = await getPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        
        const comments = await getCommentsByPostId(postId);
        res.json(comments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Ошибка при получении комментариев' });
    }
});

// Создать комментарий (только авторизованные пользователи)
app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
            return res.status(400).json({ error: 'Неверный ID поста' });
        }
        
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Содержание комментария обязательно' });
        }
        
        if (content.trim().length < 3) {
            return res.status(400).json({ error: 'Комментарий слишком короткий' });
        }
        
        if (content.trim().length > 1000) {
            return res.status(400).json({ error: 'Комментарий слишком длинный' });
        }
        
        // Проверяем, существует ли пост
        const post = await getPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }
        
        // Создаем комментарий
        const commentId = await createComment(
            postId,
            req.user.id,
            req.user.username,
            content.trim()
        );
        
        res.status(201).json({ 
            id: commentId,
            message: 'Комментарий добавлен',
            comment: {
                id: commentId,
                post_id: postId,
                user_id: req.user.id,
                username: req.user.username,
                content: content.trim(),
                role: req.user.role,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Ошибка при добавлении комментария' });
    }
});

// Удалить комментарий (только автор или админ)
app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.id);
        if (isNaN(commentId)) {
            return res.status(400).json({ error: 'Неверный ID комментария' });
        }
        
        // Получаем комментарий
        const comment = await getCommentById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }
        
        // Проверяем права: только автор или админ могут удалять
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Недостаточно прав для удаления' });
        }
        
        const deleted = await deleteComment(commentId);
        if (!deleted) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }
        
        res.json({ 
            message: 'Комментарий удалён',
            deletedId: commentId
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Ошибка при удалении комментария' });
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

// Обслуживаем другие страницы
app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/about.html'));
});

app.get('/screenshots.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/screenshots.html'));
});

app.get('/devlog.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/devlog.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// Обслуживаем любые другие HTML файлы
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, '../public', req.path);
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Страница не найдена');
    }
});

// Обслуживаем статические файлы (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, '../public')));

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Socialist Republic API'
    });
});

// Обработка 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint не найден' });
});

// Обработка 404 для страниц
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Если это ошибка валидации JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Неверный токен' });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Токен истек' });
    }
    
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, async () => {
    try {
        await initDatabase();
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`📝 Blog: http://localhost:${PORT}/blog.html`);
        console.log(`🔑 Login: http://localhost:${PORT}/login.html`);
        console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
        console.log(`🔐 Admin account: admin / admin123`);
        console.log(`📁 Static files: http://localhost:${PORT}/style.css`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});