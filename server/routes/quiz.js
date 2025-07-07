import express from "express";
import { createQuiz, getQuiz, getUserQuizzes, getQuizFeedback } from "../controllers/quiz.js";
import { submitQuizAttempt } from "../controllers/testAttempt.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), "uploads/temp");
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024, files: 5 },
});

router.post("/new", verifyToken, upload.array("files"), createQuiz);
router.get("/user", verifyToken, getUserQuizzes); // New route
router.get("/:id", verifyToken, getQuiz);
router.get("/:id/feedback", getQuizFeedback);


export default router;