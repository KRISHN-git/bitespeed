import { Router } from "express";
import { identifyController } from "./controller/IdentifyController";

const router = Router();

router.post("/identify", identifyController);

export default router;