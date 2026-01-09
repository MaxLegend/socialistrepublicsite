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
                console.log('📦 Connected to SQLite database');
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

        // Таблица постов (остаётся)
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT DEFAULT 'Developer',
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) reject(err);
            else {
                // Создаём первого админа по умолчанию
                createDefaultAdmin().then(resolve).catch(resolve);
            }
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
    deletePost
};