import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db/index.js";
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

runMigrations();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/subcontractors", subcontractorsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/notes", notesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/registry", registryRouter);
app.use("/api/reports", reportsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Supplier Lens API listening on http://localhost:${port}`);
});
