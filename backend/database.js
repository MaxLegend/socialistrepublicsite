const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blog.db');
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(' Connected to SQLite database');
                createTables().then(resolve).catch(reject);
            }
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        // Таблица пользователей
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) reject(err);
        });

        // Таблица постов (ИСПРАВЛЕННАЯ ВЕРСИЯ)
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT DEFAULT 'Developer',
                user_id INTEGER DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Table posts successful created');
                createDefaultAdmin().then(resolve).catch(resolve);
            }
        });
        db.run(`
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`, (err) => {
    if (err) console.error('Error creating comments table:', err);
    else console.log('Table comments successful created');
});
    });
}

async function createDefaultAdmin() {
    const adminExists = await getUserByUsername('admin');
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'admin@example.com', 'admin'],
                (err) => {
                    if (err) reject(err);
                    else {
                        console.log('👑 Создан аккаунт админа: admin / admin123');
                        resolve();
                    }
                }
            );
        });
    }
}

// ================== ПОЛЬЗОВАТЕЛИ ==================

function createUser(username, password, email, role = 'user') {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) reject(err);
            db.run(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, email, role],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    });
}

function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

// ================== ПОСТЫ (обновленные) ==================

function getAllPosts() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM posts ORDER BY created_at DESC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function createPost(title, content, author, userId = null) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO posts (title, content, author, user_id) VALUES (?, ?, ?, ?)',
            [title, content, author, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// Остальные функции остаются без изменений
function getPostById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function updatePost(id, title, content) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, id],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function deletePost(id) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM posts WHERE id = ?', [id], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}
// ================== КОММЕНТАРИИ ==================

// Получить все комментарии для поста
function getCommentsByPostId(postId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT c.*, u.username, u.role 
             FROM comments c 
             LEFT JOIN users u ON c.user_id = u.id 
             WHERE c.post_id = ? 
             ORDER BY c.created_at ASC`,
            [postId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Создать комментарий
function createComment(postId, userId, username, content) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)',
            [postId, userId, username, content],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// Удалить комментарий (только автор или админ)
function deleteComment(commentId) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM comments WHERE id = ?', [commentId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

// Получить комментарий по ID
function getCommentById(commentId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}
module.exports = {
    initDatabase,
    // Пользователи
    createUser,
    getUserByUsername,
    getUserById,
    verifyPassword,
    // Посты
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    // Комментарии
    getCommentsByPostId,
    createComment,
    deleteComment,
    getCommentById
};