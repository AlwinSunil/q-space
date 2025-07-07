import prisma from "../prisma.js";
import { generateFeedback } from "../utils/feedback.js";

export const submitQuizAttempt = async (req, res) => {
    try {
        const userId = req.user.userId;
        const quizId = req.params.id;
        const { userAnswers } = req.body; // userAnswers: [{ quizQuestionId: string, selectedOptionIndex: number }]

        if (!userAnswers || !Array.isArray(userAnswers)) {
            return res.status(400).json({ success: false, error: "Invalid user answers format" });
        }

        // Fetch the quiz and its questions
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { quizQuestions: true },
        });

        if (!quiz) {
            return res.status(404).json({ success: false, error: "Quiz not found" });
        }

        // Fetch user's API key and check validity
        const userAPIKey = await prisma.userAPIKey.findUnique({
            where: { userId },
        });

        if (!userAPIKey || !userAPIKey.isValid) {
            return res.status(403).json({ success: false, error: "Valid Google API key is required to submit quiz attempts." });
        }

        let correctAnswersCount = 0;
        let incorrectAnswersCount = 0;

        // Calculate score
        const detailedUserAnswers = userAnswers.map(userAnswer => {
            const question = quiz.quizQuestions.find(q => q.id === userAnswer.quizQuestionId);
            if (question) {
                if (question.correctOption === userAnswer.selectedOptionIndex) {
                    correctAnswersCount++;
                } else {
                    incorrectAnswersCount++;
                }
                return { ...userAnswer, isCorrect: question.correctOption === userAnswer.selectedOptionIndex };
            }
            return { ...userAnswer, isCorrect: false }; // Question not found or invalid
        });

        const totalQuestions = quiz.quizQuestions.length;
        const score = totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;

        // --- PHASE 3 INTEGRATION: AI Feedback Agent ---
        let feedback = {};
        try {
            feedback = await generateFeedback(
                req.user.apiKey,
                quiz.quizQuestions,
                detailedUserAnswers,
                quiz.quizQuestions.map(q => q.correctOption),
                score,
                quiz.originalContentSummary
            );
        } catch (aiError) {
            console.error("Error generating AI feedback:", aiError);
            feedback = { overall: "Could not generate AI feedback at this time.", details: aiError.message };
        }
        // --- END PHASE 3 INTEGRATION ---

        const testAttempt = await prisma.testAttempt.create({
            data: {
                userId,
                quizId,
                score,
                correctAnswersCount,
                incorrectAnswersCount,
                userAnswers: detailedUserAnswers, // Store the detailed answers
                feedback,
                takenAt: new Date(),
            },
        });

        res.status(201).json({
            success: true,
            message: "Quiz attempt submitted successfully",
            testAttemptId: testAttempt.id,
            score: testAttempt.score,
            feedback: testAttempt.feedback,
        });
    } catch (error) {
        console.error("Error submitting quiz attempt:", error);
        res.status(500).json({
            success: false,
            error: "Failed to submit quiz attempt",
            details: error.message,
        });
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
