import express from "express";
import { submitQuizAttempt, getTestAttemptDetails, getUserTestAttempts } from "../controllers/testAttempt.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/:id/submit", verifyToken, submitQuizAttempt);
router.get("/user", verifyToken, getUserTestAttempts);
router.get("/:id", verifyToken, getTestAttemptDetails);

export default router;