import express from "express";
import {
  bridgeCall,
  callStatusWebhook,
  connectCall,
  getToken,
  handleIncomingCall,

} from "../controllers/twilioController";

const router = express.Router();

router.post("/events", callStatusWebhook);
router.post("/bridge", bridgeCall);  // ✅ THIS IS FINE
router.post("/incoming", handleIncomingCall);
router.post("/connect", connectCall); // ✅ THIS IS FINE
router.get("/token", getToken);
router.post("/token", getToken);

export default router;
