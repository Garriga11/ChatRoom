const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');
const app = express();
const server = http.createServer(app);
const io = new Server(server);


const CHAT_MESSAGE_EVENT = 'chat message';

//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'testDB',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database connected!');
});

// Route for the root URL
app.get('/', (req, res) => {
    res.render('index');
});


// Signup Route
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Signup Page' });
});

app.post('/signup', (req, res) => {
    const { username, password, email } = req.body;
    const query = `INSERT INTO authuser (username, password, email) VALUES (?, ?, ?)`;
    db.query(query, [username, password, email], (err) => {
        if (err) throw err;
        res.redirect('/login');
    });
});


app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM authuser WHERE username = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            res.render('profile', { user });
        } else {
            res.send('Invalid username or password. <a href="/login">Try again</a>');
        }
    });
});

// Profile Route 
app.get('/profile', async (req, res) => {
    try {
        // Example: Check if the user is logged in
        if (!req.session || !req.session.username) {
            return res.redirect('/login'); // Redirect to login if not authenticated
        }

        const username = req.session.username;

        // Fetch additional data for the profile if needed
        const sql = 'SELECT * FROM authuser WHERE username = ?';
        const [rows] = await db.query(sql, [username]);

        if (rows.length === 0) {
            return res.redirect('/login'); // Redirect if user not found
        }

        const user = rows[0]; // Get user data from the database

        // Render the profile page with user data
        res.render('profile', {
            username: user.username,
            email: user.email,
            privateChatLink: 'privateChat',
            publicChatLink: 'publicChat'
        
        });
        
    } catch (error) {
        console.error('Error rendering profile:', error);
        res.status(500).send('Server Error');
    }
});
// Route for public chat
app.get('/publicChat', (req, res) => {
    res.render('publicChat');
});

// Route for private chat
app.get('/privateChat', (req, res) => {
    res.render('privateChat');
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on(CHAT_MESSAGE_EVENT, (msg) => {
        io.emit(CHAT_MESSAGE_EVENT, msg);
    });
});






server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

