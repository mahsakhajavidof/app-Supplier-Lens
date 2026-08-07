import "dotenv/config";
import { runMigrations } from "./db/index.js";
import { createApp } from "./app.js";
import { startDenmarkScheduler } from "./services/denmarkScheduler.js";

runMigrations();

const app = createApp();
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Supplier Lens API listening on http://localhost:${port}`);
});

// Weekly Danish-supplier monitoring — runs only while this process is
// running; catches up on anything overdue as soon as the backend starts.
startDenmarkScheduler();
