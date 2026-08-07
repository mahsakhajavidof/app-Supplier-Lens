import "dotenv/config";
import { runMigrations } from "./db/index.js";
import { createApp } from "./app.js";

runMigrations();

const app = createApp();
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Supplier Lens API listening on http://localhost:${port}`);
});
