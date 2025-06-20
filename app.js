import express from 'express';
import database from './db.js';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import session from 'express-session';

const port = 3000;
const app = express();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setups
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'your-secret-key', // 🔒 change this to a strong secret
  resave: false,
  saveUninitialized: false
}));


// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));

});

app.get('/signup', (req, res) => {
  res.render('signup');
});




app.post('/signup', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // Hash the password (secure)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into the database
    const result = await database.query(
      'INSERT INTO users (name, phone, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email',
      [name, phone, email, hashedPassword]
    );

    console.log("User created:", result.rows[0]);

    // Redirect to login page
    res.redirect('/login');  // Assumes /login route serves the login page
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send('Something went wrong. Please try again.');
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Get user by email
    const result = await database.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).send('<h3>User not found. Please try again.</h3>');
    }

    const user = result.rows[0];

    // ✅ Step 2: Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      console.log('User authenticated:', user.id);

      // ✅ Store session data
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
      res.status(401).send('<h3>Invalid credentials. Please try again.</h3>');
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('<h3>Server Error. Please try again.</h3>');
  }
});




app.get('/donate', (req, res) => {
  res.render('donate')
})


app.post('/donate', async (req, res) => {
  const { name, email, phone, blood_group, weight, age, address } = req.body;

  try {
    const result = await database.query(
      `INSERT INTO donors (name, email, phone, blood_group, weight, age, address) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [name, email, phone, blood_group, weight, age, address]
    );

    console.log('Donation recorded with ID:', result.rows[0].id);

    // ✅ Only this line — no res.send() before this
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } catch (err) {
    console.error('Donation Error:', err);
    res.status(500).send(`<h3>Something went wrong. Please try again later.</h3>`);
  }
});

app.get('/profile', async (req, res) => {
  // ✅ Check if user is logged in
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const email = req.session.user.email;

  try {
    // ✅ Fetch full user details from database
    const result = await database.query(
      `SELECT name, email, phone, blood_group, age, weight, address 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    // ✅ Render the profile.ejs with user details
    const user = result.rows[0];
    res.render('profile', { user });

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Server error');
  }
});





app.get('/donors', async (req, res) => {
  try {
    // Get all donors
    const result = await database.query('SELECT * FROM donors ORDER BY created_at DESC');

    // Get total count
    const countResult = await database.query('SELECT COUNT(*) FROM donors');
    const total = parseInt(countResult.rows[0].count);

    // Render view
    res.render('donors', { donors: result.rows, total });
  } catch (err) {
    console.error("Error fetching donors:", err);
    res.status(500).send('Error fetching donors.');
  }
});


app.post('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

app.get('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
