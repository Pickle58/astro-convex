import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "purge expired comment suggestions",
  "0 3 * * *",
  internal.suggestions.purgeExpired,
  {},
);

export default crons;
