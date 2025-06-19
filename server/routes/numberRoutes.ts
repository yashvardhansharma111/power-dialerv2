import express from "express";
import { getAvailableNumbers } from "../controllers/numberController";
import verifyToken from "../middleware/verifyToken";

const router = express.Router();
router.get("/available", verifyToken, getAvailableNumbers);

export default router;
