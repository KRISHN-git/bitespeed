import "reflect-metadata";
import express from "express";
import { AppDataSource } from "../ormconfig";
import router from "./routes";

const app = express();
app.use(express.json());
app.use(router);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected.");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });