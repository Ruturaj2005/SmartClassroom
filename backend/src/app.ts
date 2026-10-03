import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './config/config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import facultyRoutes from './routes/faculty';
import rfidRoutes from './routes/rfid';
import courseRoutes from './routes/courses';
import classroomRoutes from './routes/classrooms';
import timetableRoutes from './routes/timetable';
import materialRoutes from './routes/materials';
import otherRoutes from './routes/index';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions: cors.CorsOptions = {
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Rate limiting (auth endpoints only) ───────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Swagger UI ────────────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartClass API',
      version: '1.0.0',
      description:
        'SmartClass — Context-aware classroom content delivery system. ' +
        'This API is consumed by the React frontend and will later be consumed by Raspberry Pi edge devices.',
    },
    servers: [{ url: `/api/v1`, description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ── API routes ─────────────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use('/auth', authLimiter, authRoutes);
v1.use('/faculty', facultyRoutes);
v1.use('/rfid', rfidRoutes);
v1.use('/courses', courseRoutes);
v1.use('/classrooms', classroomRoutes);
v1.use('/timetable', timetableRoutes);
v1.use('/materials', materialRoutes);
v1.use('/', otherRoutes);

app.use('/api/v1', v1);

// ── 404 + Error handling (must be last) ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
