import app from "./app";
import { logger } from "./lib/logger";
import { seedFarmData } from "./lib/farm-data";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedFarmData()
  .then(() => app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  }))
  .catch((err: unknown) => {
    logger.error({ err }, "Farm data initialization failed");
    process.exit(1);
  });
