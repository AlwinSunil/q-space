import prisma from "../prisma.js";
import { generateFeedback } from "../utils/feedback.js";
import path from "path";
import fs from "fs/promises";

// POST /api/test-attempts/:id/submit
export const submitQuizAttempt = async (req, res) => {
    try {
        const testAttemptId = req.params.id;
        const { userAnswers } = req.body;

        // Fetch the test attempt and quiz
        const testAttempt = await prisma.testAttempt.findUnique({
            where: { id: testAttemptId },
            include: { quiz: { include: { quizQuestions: true } } }
        });
        // Fix: If testAttempt is not found, return 404 with a clear message
        if (!testAttempt) {
            return res.status(404).json({ error: "Test attempt not found" });
        }
        if (!testAttempt.quiz) {
            return res.status(404).json({ error: "Quiz not found for this test attempt" });
        }

        // Get user API key
        const user = await prisma.user.findUnique({
            where: { id: testAttempt.userId },
            include: { userAPIKey: true }
        });
        if (!user || !user.userAPIKey || !user.userAPIKey.isValid || !user.userAPIKey.apiKey) {
            return res.status(403).json({ error: "Valid Google API key is required to generate feedback." });
        }

        // Get full content context (same as feedback button logic)
        let fullContent = "";
        try {
            const quizDir = path.join(process.cwd(), "uploads/files", testAttempt.quiz.id);
            const files = await fs.readdir(quizDir);
            const txtFiles = files.filter(f => f.endsWith(".txt"));
            if (txtFiles.length > 0) {
                const contents = await Promise.all(
                    txtFiles.map(f => fs.readFile(path.join(quizDir, f), "utf8"))
                );
                fullContent = contents.join("\n\n");
            }
        } catch (e) {
            fullContent = testAttempt.quiz.originalContentSummary || "";
        }

        // Prepare userAnswers in the correct format
        const quizQuestions = testAttempt.quiz.quizQuestions;
        const formattedUserAnswers = quizQuestions.map(q => {
            const ua = userAnswers.find(ans => ans.quizQuestionId === q.id);
            return {
                quizQuestionId: q.id,
                selectedOptionIndex: ua ? ua.selectedOptionIndex : null,
                isCorrect: ua ? ua.selectedOptionIndex === q.correctOption : false,
            };
        });

        // Calculate score (percentage)
        let correct = 0;
        for (let i = 0; i < quizQuestions.length; i++) {
            if (formattedUserAnswers[i].isCorrect) correct++;
        }
        const score = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 100) : 0;

        // Generate feedback (same as manual button flow)
        const feedback = await generateFeedback(
            user.userAPIKey.apiKey,
            quizQuestions,
            formattedUserAnswers,
            score,
            fullContent
        );

        // Store user answers, score, and feedback in the testAttempt
        await prisma.testAttempt.update({
            where: { id: testAttemptId },
            data: {
                userAnswers: formattedUserAnswers,
                score,
                feedback
            }
        });

        res.status(201).json({
            success: true,
            testAttemptId,
            score,
            feedback
        });
    } catch (err) {
        console.error("Error in submitQuizAttempt:", err);
        res.status(500).json({ error: "Failed to submit quiz and generate feedback" });
    }
};

export const getTestAttemptDetails = async (req, res) => {
    try {
        const testAttemptId = req.params.id;
        const userId = req.user.userId;

        const testAttempt = await prisma.testAttempt.findUnique({
            where: { id: testAttemptId, userId }, // Ensure user ownership
            include: {
                quiz: { include: { quizQuestions: true } }, // Include quiz and its questions
                user: true, // Include user details if needed
            },
        });

        if (!testAttempt) {
            return res.status(404).json({ success: false, error: "Test attempt not found or unauthorized" });
        }

        res.status(200).json({
            success: true,
            testAttempt,
        });
    } catch (error) {
        console.error("Error fetching test attempt details:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch test attempt details",
            details: error.message,
        });
    }
};

export const getUserTestAttempts = async (req, res) => {
    console.log("getUserTestAttempts controller reached!");
    console.log("getUserTestAttempts controller reached!");
    try {
        const userId = req.user.userId;

        const testAttempts = await prisma.testAttempt.findMany({
            where: { userId },
            include: {
                quiz: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                takenAt: "desc",
            },
        });

        res.status(200).json({
            success: true,
            testAttempts,
        });
    } catch (error) {
        console.error("Error fetching user test attempts:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user test attempts",
            details: error.message,
        });
    }
};

// Add this endpoint to create a new test attempt for a quiz and user
export const startTestAttempt = async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.userId;

        // Check if quiz exists
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { quizQuestions: true }
        });
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        // Optionally: allow only one active attempt per user/quiz, or always create new
        // Here: always create a new attempt (for retake)
        const testAttempt = await prisma.testAttempt.create({
            data: {
                quizId,
                userId,
                userAnswers: quiz.quizQuestions.map(q => ({
                    quizQuestionId: q.id,
                    selectedOptionIndex: null,
                    isCorrect: false,
                })),
                score: 0,
                takenAt: new Date(),
                feedback: null
            }
        });

        res.status(201).json({ success: true, testAttempt });
    } catch (err) {
        console.error("Error in startTestAttempt:", err);
        res.status(500).json({ error: "Failed to start test attempt" });
    }
};

// Add this endpoint to get the latest test attempt for a quiz and user
export const getTestAttemptByQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.userId;

        const testAttempt = await prisma.testAttempt.findFirst({
            where: { quizId, userId },
            orderBy: { takenAt: "desc" }
        });

        res.status(200).json({ testAttempt });
    } catch (err) {
        console.error("Error in getTestAttemptByQuiz:", err);
        res.status(500).json({ error: "Failed to fetch test attempt" });
    }
};

export const regenerateFeedback = async (req, res) => {
    try {
        const testAttemptId = req.params.id;
        // Reuse your helper for feedback generation
        await generateAndStoreFeedbackForTestAttempt(testAttemptId);
        // Fetch updated testAttempt
        const updated = await prisma.testAttempt.findUnique({
            where: { id: testAttemptId }
        });
        res.status(200).json({ feedback: updated.feedback });
    } catch (err) {
        console.error("Error in regenerateFeedback:", err);
        res.status(500).json({ error: "Failed to regenerate feedback" });
    }
};