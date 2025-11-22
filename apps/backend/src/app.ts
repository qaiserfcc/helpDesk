import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import createError from "http-errors";
import swaggerUi from "swagger-ui-express";
import router from "./routes/index.js";
import swaggerDocument from "./config/swagger.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, { explorer: true }),
);
app.get("/docs.json", (_req, res) => {
  res.json(swaggerDocument);
});

app.use("/api", router);

app.use((_req, _res, next) => {
  next(createError(404, "Resource not found"));
});

app.use(
  (
    err: createError.HttpError,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent && _next) {
      return _next(err);
    }
    const status = err.status || 500;
    res.status(status).json({
      status,
      message: err.message || "Unexpected error",
    });
  },
);

export default app;
