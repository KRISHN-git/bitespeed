import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Contact } from "./src/entity/Contact";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3307,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "bitespeed",
  synchronize: true,
  logging: false,
  entities: [Contact],
});