import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import uploadRoutes from "./routes/upload.routes.js";
import voiceRoutes from "./routes/voice.routes.js";
import matrixRoutes from "./routes/matrix.routes.js";
import authRoutes from "./routes/auth.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import lineRoutes from "./routes/line.routes.js";
import actionLogRoutes from "./routes/actionLog.routes.js";
import roleRoutes from "./routes/role.routes.js";
import colorRoutes from "./routes/color.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import kanbanRoutes from "./routes/kanban.routes.js"
import oqcRoutes from "./routes/oqc.routes.js";
import doubleCheckRoutes from "./routes/doubleCheck.routes.js";
import barcodeDeliveryScanRoutes from "./routes/barcodeDeliveryScan.routes.js";
import qrFormatRoutes from "./routes/qrFormat.routes.js";
import groupMenuRoutes from "./routes/groupMenu.routes.js";
import userRoutes from "./routes/user.routes.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { authorizeMenu } from "./middlewares/rbac.middleware.js";

import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CORS_ORIGINS || "https://kvs-demo.karsa-dev.my.id")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        const error = new Error("Not allowed by CORS");
        error.status = 403;
        return callback(error);
    },
    credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    dotfiles: "deny",
    index: false,
    maxAge: "1h",
    setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
    },
}));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

app.get("/", (req, res) => {
    res.send("Connected to Warehouse API");
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter, authenticate, authorizeMenu);
app.use("/api/uploads", uploadRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/lines", lineRoutes);
app.use("/api/matrix", matrixRoutes);
app.use("/api/action-logs", actionLogRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/colors", colorRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/kanbans", kanbanRoutes);
app.use("/api/oqcs", oqcRoutes);
app.use("/api/double-check", doubleCheckRoutes);
app.use("/api/barcode-delivery-scans", barcodeDeliveryScanRoutes);
app.use("/api/qr-formats", qrFormatRoutes);
app.use("/api/group-menus", groupMenuRoutes);
app.use("/api/users", userRoutes);

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;
    const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    const message = safeStatusCode >= 500 ? "Internal server error" : err.message;

    return res.status(safeStatusCode).json({
        message,
    });
});

export default app;
