import "dotenv/config";
import { db, runMigrations } from "./index.js";
import { REQUIRED_MEMBERS, runTeamCleanup } from "./teamCleanup.js";

async function main() {
  runMigrations();
  console.log("Cleaning up team members…");

  const { removed } = await runTeamCleanup(db);
  for (const name of removed) {
    console.log(`Removed demo team member "${name}" (their records were reassigned to Mohammad Khajavi).`);
  }
  console.log(
    `Done. Removed ${removed.length} demo team member(s). Team is now: ${REQUIRED_MEMBERS.map((m) => m.name).join(", ")}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
