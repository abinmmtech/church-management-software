// index.js
const bcrypt = require('bcrypt');
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const { Pool } = require('pg');
const bodyParser = require('body-parser');

const pool = new Pool({
    user: 'church_admin',    // Replace with your Postgres username
    host: 'localhost',
    database: 'church_management', // Replace with your database name
    password: 'chadmin', // Replace with your Postgres password
    port: 5432,
});


// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

// Serve static files from 'views' folder
app.use(express.static(path.join(__dirname, 'views')));

// Serve the login page when navigating to root '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve the login page when navigating to '/login.html'
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve the registration page when navigating to '/register.html'
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});


app.post('/register', async (req, res) => {
    const { firstName, lastName, username, password, confirmPassword, passwordHint, mobile, email } = req.body;

    // Validate that all required fields are provided
    if (!firstName || !lastName || !username || !password || !confirmPassword || !passwordHint || !mobile) {
        return res.redirect(`/register.html?error=❌ All fields are required.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
    }

    // Validate mobile number (exactly 10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
        return res.redirect(`/register.html?error=❌ Mobile number must be exactly 10 digits.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
    }

    // Validate password and confirm password match
    if (password !== confirmPassword) {
        return res.redirect(`/register.html?error=❌ Password and Confirm Password must match.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
    }

    // Validate that password and password hint are different
    if (password === passwordHint) {
        return res.redirect(`/register.html?error=❌ Password and Password Hint cannot be the same.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
    }

    try {
        // Check if the username already exists in the database
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (existingUser.rows.length > 0) {
            return res.redirect(`/register.html?error=❌ Username already exists.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await pool.query(
            'INSERT INTO users (first_name, last_name, username, password, password_hint, mobile, email, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)',
            [firstName, lastName, username, hashedPassword, passwordHint, mobile, email]
        );

        // Redirect to the login page with success message
        res.redirect('/login.html?success=✅ Registration successful! Please log in.');
    } catch (error) {
        console.error('Error registering user:', error);
        return res.redirect(`/register.html?error=❌ Error registering user. Please try again.&firstName=${firstName}&lastName=${lastName}&username=${username}&mobile=${mobile}&email=${email}&passwordHint=${passwordHint}`);
    }
});

//===============================================================================================================
//                                  LOG IN                                          //
//===============================================================================================================
let isAdmin = false;
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
        return res.redirect('/login.html?error=❌ Please enter both username and password.');
    }

    try {
        // Query the database to check if the username exists
        const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (user.rows.length === 0) {
            // User not found
            return res.redirect('/login.html?error=❌ Invalid username or password.');
        }

        // Compare the entered password with the stored password hash
        const isMatch = await bcrypt.compare(password, user.rows[0].password);

        if (!isMatch) {
            // If password does not match
            return res.redirect('/login.html?error=❌ Invalid username or password.');
        }

        // If login is successful, check if the user is an admin
        const isAdmin = user.rows[0].username === 'admin';  // Assuming 'admin' is the admin username

        if (isAdmin) {
            // If admin, redirect to the user list page
            return res.redirect('/user-list.html?success=✅ Successfully logged in as Admin.');
        } else {
            // If not admin, redirect to a different page (e.g., dashboard)
            return res.redirect('/dashboard.html?success=✅ Successfully logged in.');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        return res.redirect('/login.html?error=❌ An error occurred. Please try again.');
    }
});

// Serve the dashboard (or admin) page
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});


//===============================================================================================================
//===============================================================================================================

//===============================================================================================================
//                                                  AFTER ADMIN USER LOG IN                                          //
//===============================================================================================================
// Serve the admin user list page
app.get('/user-list.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'user-list.html'));
});

// Fetch all users for the admin dashboard
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, first_name, last_name, username, mobile, email FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/delete-user/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Delete the user from the database
        const result = await pool.query('DELETE FROM users WHERE username = $1', [username]);

        if (result.rowCount === 0) {
            // If no rows were deleted, the user wasn't found
            return res.redirect('/user-list.html?error=❌ User not found.');
        }

        // Redirect to the user list with a success message
        res.redirect('/user-list.html?success=✅ User deleted successfully.');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect('/user-list.html?error=❌ An error occurred while deleting the user.');
    }
});



//===============================================================================================================
//===============================================================================================================

// Serve the forgot password page when navigating to '/forgot-password.html'
app.get('/forgot-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'forgot-password.html'));
});

app.post('/forgot-password', async (req, res) => {
    let { username, password_hint, newPassword } = req.body;

    // Ensure all fields are treated as strings and trimmed of any extra spaces
    username = String(username).trim();
    password_hint = String(password_hint).trim(); // Make sure it's a string
    newPassword = String(newPassword).trim();

    if (!username || !password_hint || !newPassword) {
        return res.status(400).json({ success: false, message: '❌ Please provide all the required fields.' });
    }

    if (password_hint.toLowerCase() === newPassword.toLowerCase()) {
        return res.status(400).json({ success: false, message: '❌ Password hint and new password cannot be the same.' });
    }
    
    try {
        // Check if the user exists
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '❌ No user found with this username.' });
        }

        const user = result.rows[0];
        const userPasswordHint = user.password_hint.trim();
        const enteredPasswordHint = password_hint.trim();

        // Compare the hints in a case-insensitive manner
        if (userPasswordHint.toLowerCase() !== enteredPasswordHint.toLowerCase()) {
            return res.status(400).json({ success: false, message: '❌ Incorrect password hint.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update both password and confirm_password columns with the hashed password
        await pool.query('UPDATE users SET password = $1, confirm_password = $2 WHERE username = $3', [hashedPassword, hashedPassword, username]);

        return res.json({ success: true, message: '✅ Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ success: false, message: '❌ An error occurred. Please try again.' });
    }
});



app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

