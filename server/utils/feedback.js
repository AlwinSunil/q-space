import { getFeedbackAgent } from "../services/ai.js";

// 1. Ensure originalContentSummary is always a string (never null/undefined)
// 2. Add more robust error handling and logging for agent output
// 3. (Frontend chart/visual feedback is handled in React, not here)

export const generateFeedback = async (
    apiKey,
    quizQuestions, // Array of full question objects from quiz.quizQuestions
    userAnswers,   // Array of user answer objects from testAttempt.userAnswers
    overallScore,  // The calculated score (number)
    originalContentSummary // The original content summary (string)
) => {
    try {
        // Defensive: Ensure apiKey is a non-empty string
        if (!apiKey || typeof apiKey !== "string") {
            throw new Error("No API key provided to generateFeedback");
        }

        // Defensive: Ensure overallScore is a number (not an array)
        const safeScore = Array.isArray(overallScore)
            ? (overallScore.length > 0 ? overallScore[0] : 0)
            : (typeof overallScore === "number" ? overallScore : 0);

        // Defensive: Ensure originalContentSummary is a string
        const safeContentSummary =
            typeof originalContentSummary === "string" && originalContentSummary.trim().length > 0
                ? originalContentSummary
                : "No summary provided. Please reference the quiz questions for context.";

        // Prepare quizAttemptDetails for the feedback agent
        const quizAttemptDetails = quizQuestions.map(q => {
            const userAnswer = userAnswers.find(ua => ua.quizQuestionId === q.id);
            const selectedOptionIndex = userAnswer ? userAnswer.selectedOptionIndex : null;
            const isCorrect = selectedOptionIndex !== null && selectedOptionIndex === q.correctOption;

            return {
                questionId: q.id,
                question: q.question,
                options: q.options,
                correctOption: q.correctOption,
                selectedOptionIndex: selectedOptionIndex,
                isCorrect: isCorrect,
            };
        });

        const context = {
            quizAttemptDetails,
            score: safeScore,
            originalContentSummary: safeContentSummary,
        };

        // Pass context to the feedback agent
        const feedbackAgent = await getFeedbackAgent(
            apiKey,
            context.quizAttemptDetails,
            context.score,
            context.originalContentSummary
        );

        console.log("Feedback context sent to agent:", context);

        const agentResponse = await feedbackAgent.invoke({
            messages: [
                {
                    role: "user",
                    content: "Generate feedback for this quiz attempt. Use the get_quiz_context tool to access all quiz data."
                }
            ]
        });

        console.log("Raw agent output:", agentResponse.output);

        let parsed;
        try {
            parsed = JSON.parse(agentResponse.output);
        } catch (e) {
            console.error("AI feedback output not valid JSON:", agentResponse.output);
            return {
                overallFeedback: "Failed to generate detailed feedback. Invalid JSON from AI.",
                questionFeedback: [],
                recommendations: "Please try again later.",
                debug: agentResponse.output
            };
        }
        return parsed;
    } catch (error) {
        console.error("Error generating AI feedback:", error, {
            apiKey: !!apiKey,
            quizQuestionsLength: quizQuestions?.length,
            userAnswersLength: userAnswers?.length,
            overallScore,
            originalContentSummaryType: typeof originalContentSummary,
        });
        return {
            overallFeedback: "Failed to generate detailed feedback.",
            questionFeedback: [],
            recommendations: "Please try again later.",
            debug: error?.message || error // Add error message for debugging
        };
    }
};
