import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import { subcontractorsRouter } from "./routes/subcontractors.js";
import { eventsRouter } from "./routes/events.js";
import { tasksRouter } from "./routes/tasks.js";
import { notesRouter } from "./routes/notes.js";
import { documentsRouter } from "./routes/documents.js";
import { settingsRouter } from "./routes/settings.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { registryRouter } from "./routes/registry.js";
import { reportsRouter } from "./routes/reports.js";
import { riskAssessmentRouter } from "./routes/riskAssessment.js";

// Builds the Express app without starting it or touching migrations, so
// tests can import it directly (e.g. with supertest) against a database of
// their choosing. The real server entrypoint is index.ts.
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/subcontractors", subcontractorsRouter);
  app.use("/api/subcontractors", riskAssessmentRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/registry", registryRouter);
  app.use("/api/reports", reportsRouter);

  app.use(errorHandler);
  return app;
}
