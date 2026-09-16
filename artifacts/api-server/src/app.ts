import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

// Keep the production frontend origin available even if Render's FRONTEND_URL
// environment variable is missing or stale. Multiple origins can still be
// supplied through FRONTEND_URL as a comma-separated value.
const allowedOrigins = Array.from(new Set([
  "https://bh-farm-os.vercel.app",
  ...(process.env.FRONTEND_URL ?? "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]));

// Handle CORS explicitly before the API router. This guarantees that browser
// OPTIONS preflight requests receive the CORS headers even when authentication
// or another router middleware would otherwise reject the request.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
