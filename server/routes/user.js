import express from "express";
import { updateUserProfile, saveUserAPIKey } from "../controllers/userProfile.js";
import { verifyToken } from "../middleware/auth.js";  // Updated import

const router = express.Router();

router.post("/profile", verifyToken, updateUserProfile);
router.post("/api-key", verifyToken, saveUserAPIKey);

export default router;
