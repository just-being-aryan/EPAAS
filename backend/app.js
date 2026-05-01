import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import nodalRoutes from "./routes/nodal.routes.js";
import technicalRoutes from "./routes/technical.routes.js";
import expertRoutes from "./routes/expert.routes.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ transport: { target: "pino-pretty" } }));
app.use(globalLimiter);

app.get("/", (req, res) => res.json({ success: true, message: "E-PAAS API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/nodal", nodalRoutes);
app.use("/api/technical", technicalRoutes);
app.use("/api/expert", expertRoutes);

app.use(errorHandler);

export default app;
