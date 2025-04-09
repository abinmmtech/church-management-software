// index.js
const bcrypt = require('bcrypt');
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const { Pool } = require('pg');


const pool = new Pool({
    user: 'church_admin',    // Replace with your Postgres username
    host: 'localhost',
    database: 'church_management', // Replace with your database name
    password: 'chadmin', // Replace with your Postgres password
    port: 5432,
});

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve register.html
app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

// Registration route
app.post('/register', async (req, res) => {
    const { firstName, lastName, username, password, passwordHint, mobile, email } = req.body;

    if (!firstName || !lastName || !username || !password || !passwordHint || !mobile) {
        return res.render('register.html', { error: '❌ All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (first_name, last_name, username, password, password_hint, mobile, email, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)',
            [firstName, lastName, username, hashedPassword, passwordHint, mobile, email]
        );

        // Redirect to login page on successful registration
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error registering user:', error);
        res.render('register.html', { error: '❌ Error registering user. Please try again.' });
    }
});


// Serve forgot-password.html
app.get('/forgot-password.html', (req, res) => {
    res.sendFile(__dirname + '/views/forgot-password.html');
});
// Forgot password route
app.post('/forgot-password', async (req, res) => {
    const { username, passwordHint, newPassword } = req.body;

    try {
        // Check user and password hint
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1 AND password_hint = $2', [username, passwordHint]);

        if (userResult.rows.length === 0) {
            return res.status(400).send('❌ Invalid username or password hint');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);

        res.send('✅ Password reset successful!');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('❌ Error resetting password');
    }
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

