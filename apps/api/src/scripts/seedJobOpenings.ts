import { seedJobOpenings } from "../lib/seed/seedJobOpenings";

seedJobOpenings({ throwOnError: true })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed:job-openings] failed:", err);
    process.exit(1);
  });
