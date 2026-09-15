"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_routes_1 = __importDefault(require("./routes/api.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const db_1 = require("./config/db");
const scheduler_job_1 = require("./jobs/scheduler.job");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Static uploads serving
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health Check API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Company Important Date & Task Management API',
        version: '1.0.0',
    });
});
// API Routes
app.use('/api', api_routes_1.default);
// Static frontend SPA serving (Production)
const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
// Global Error Handler
app.use(errorHandler_1.errorHandler);
// Bootstrap
async function bootstrap() {
    try {
        // 1. Verify SQL Server database connectivity
        await (0, db_1.getDbPool)();
        console.log('[Bootstrap] SQL Server Database Connection Verified.');
        // 2. Start Background Scheduler
        (0, scheduler_job_1.initScheduler)();
        // 3. Start HTTP Server
        app.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(`🚀 Company Task Management Portal & API running on port ${PORT}`);
            console.log(`📡 URL: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log(`=======================================================`);
        });
    }
    catch (err) {
        console.error('[Bootstrap Error] Failed to start server:', err.message);
        process.exit(1);
    }
}
bootstrap();
