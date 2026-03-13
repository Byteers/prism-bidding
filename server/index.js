require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const path       = require('path');

const db            = require('./db');
const { loadFromDB }= require('./state');
const timer         = require('./timer');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  pingTimeout: 60000, pingInterval: 25000,
});

const PORT           = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'prism-secret';
const ROOMS          = (process.env.ROOMS || 'a,b').split(',').map(r => r.trim());

const sessionMiddleware = session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
});

io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res || {}, next));
app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/teams',   require('./routes/teams'));
app.use('/api/items',   require('./routes/items'));
app.use('/api/bids',    require('./routes/bids'));
app.use('/api/auction', require('./routes/auction'));

const { getFullState } = require('./state');
app.get('/api/state', (req, res) => {
  const r = req.session.roomId || req.query.room || 'a';
  res.json(getFullState(r));
});
app.get('/api/health', (req, res) => res.json({
  status: 'ok', uptime: process.uptime(),
  connections: io.engine.clientsCount, rooms: ROOMS,
}));

const pub = (f) => (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', f));

app.get('/',        pub('index.html'));
app.get('/team',    pub('team.html'));
app.get('/admin',   pub('admin.html'));
app.get('/display', pub('display.html'));
app.get('/test',    pub('test.html'));

async function boot() {
  for (const roomId of ROOMS) {
    await db.initRoom(roomId);
    loadFromDB(roomId);
    console.log(`[Boot] Room "${roomId}" ready`);
  }
  timer.init(io);
  require('./socket')(io);

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║              🏆  PRism Bidding Platform                  ║
╠══════════════════════════════════════════════════════════╣
║  Login     →  http://localhost:${PORT}                      ║
║  Admin A   →  http://localhost:${PORT}/admin?room=a         ║
║  Admin B   →  http://localhost:${PORT}/admin?room=b         ║
║  Display A →  http://localhost:${PORT}/display?room=a       ║
║  Display B →  http://localhost:${PORT}/display?room=b       ║
╠══════════════════════════════════════════════════════════╣
║  Rooms: ${ROOMS.join(', ').padEnd(49)}║
║  Admin PW: ${(process.env.ADMIN_PASSWORD||'prism@admin').padEnd(48)}║
╚══════════════════════════════════════════════════════════╝
    `);
  });
}

boot().catch(err => { console.error('Boot failed:', err); process.exit(1); });
