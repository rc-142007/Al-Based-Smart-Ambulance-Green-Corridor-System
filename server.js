require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// ─── Route Imports ─────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const hospitalRoutes = require('./routes/hospital');
const routeRoutes    = require('./routes/route');
const alertRoutes    = require('./routes/alert');
const policeRoutes   = require('./routes/police');
const junctionRoutes = require('./routes/junction');

// ─── DB Connection ─────────────────────────────────────────────────────────────
connectDB();

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ─────────────────────────────────────────────────────────────────
initSocket(server);

// ─── Core Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// ─── Serve Static Frontend ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/route',     routeRoutes);
app.use('/api/alert',     alertRoutes);
app.use('/api/police',    policeRoutes);
app.use('/api/junctions', junctionRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🚑 Ambulance AI Server is running', timestamp: new Date() });
});

// ─── Maps: no API key endpoint needed (using free OSM/OSRM/Leaflet) ───────────

// ─── Catch-All: Serve Frontend for non-API routes ─────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚑 Smart Ambulance AI Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO enabled`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}\n`);
});
