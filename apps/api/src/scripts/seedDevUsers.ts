import { seedDevUsers } from "../lib/seedDevUsers";

seedDevUsers({ throwOnError: true })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed:dev-users] failed:", err);
    process.exit(1);
  });
