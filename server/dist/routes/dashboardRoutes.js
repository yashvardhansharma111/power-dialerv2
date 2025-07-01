"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const verifyToken_1 = __importDefault(require("../middleware/verifyToken"));
const router = express_1.default.Router();
// GET /api/dashboard/stats?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
router.get("/stats", verifyToken_1.default, dashboardController_1.getDashboardStats);
exports.default = router;
