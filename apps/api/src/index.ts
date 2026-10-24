import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import settlementRoutes from './routes/settlement.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const server = http.createServer(app);

// Allowed Origins Helper
const allowedOrigins = [
  env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''),
  'http://localhost:3000'
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(clean)) return true;
  if (clean.endsWith('.vercel.app')) return true;
  return false;
}

// Security & Parsing Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Socket.IO Server
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true
  }
});

// Socket Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication required for socket connection.'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    (socket as any).userId = payload.userId;
    next();
  } catch (err) {
    next(new Error('Invalid socket token.'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`[Socket] Client connected: ${socket.id} (User: ${userId})`);

  socket.on('join_group', (groupId: string) => {
    const roomName = `group:${groupId}`;
    socket.join(roomName);
    console.log(`[Socket] User ${userId} joined room ${roomName}`);
  });

  socket.on('leave_group', (groupId: string) => {
    const roomName = `group:${groupId}`;
    socket.leave(roomName);
  });

  socket.on('typing', ({ groupId, isTyping }: { groupId: string; isTyping: boolean }) => {
    socket.to(`group:${groupId}`).emit('presence:typing', { userId, isTyping });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: env.APP_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/groups', groupsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1', settlementRoutes);
app.use('/api/v1', chatRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

const PORT = env.PORT;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  ${env.APP_NAME} API Server running on port ${PORT}`);
    console.log(`  Environment: ${env.NODE_ENV}`);
    console.log(`=======================================================`);
  });
}

export { app, server };
