import express from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import verifyToken from "../middleware/verifyToken";

const router = express.Router();

// GET /api/dashboard/stats?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
router.get("/stats", verifyToken, getDashboardStats);

export default router;
