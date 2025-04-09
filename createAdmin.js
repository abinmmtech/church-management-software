const bcrypt = require('bcrypt');
const pool = require('./db'); // your existing pool setup

async function createAdminUser() {
    const username = 'admin';
    const password = 'admin'; // change this later
    const passwordHint = 'same';
    const firstName = 'Church';
    const lastName = 'Admin';
    const mobile = '1234567890';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // DEBUG: Print values before query
        console.log('Values to be inserted:');
        console.log({
            firstName,
            lastName,
            username,
            hashedPassword,
            passwordHint,
            mobile,
        });

        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, username, password, password_hint, mobile)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [firstName, lastName, username, hashedPassword, passwordHint, mobile]
        );

        console.log('✅ Admin user created successfully:');
        console.log(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        pool.end();
    }
}

createAdminUser();
