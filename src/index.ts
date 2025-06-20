import express from "express";
import { identifyContactController } from "./contactController";
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      return `[${info.timestamp}] ${info.level}: ${info.message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

app.post("/identify", identifyContactController);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { logger };