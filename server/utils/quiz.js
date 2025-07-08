import { getGenerativeModel } from "../services/ai.js";
import prisma from "../prisma.js";

export async function generateAndStoreQuestions(
    quizId,
    fullcontext,
    questionConfig,
    apiKey,
    userBio
) {
    const { totalQuestions, types } = questionConfig;
    const totalToGenerate = types.mcq + types.trueFalse;
    let questionCounts = { mcq: 0, trueFalse: 0 };

    // 1. Check for empty context before proceeding
    if (!fullcontext || !fullcontext.trim()) {
        console.error("Quiz generation failed: No content provided for quiz generation.");
        await prisma.quiz.update({
            where: { id: quizId },
            data: { status: "FAILED" },
        });
        return;
    }

    let model;
    try {
        model = getGenerativeModel(apiKey);
    } catch (err) {
        console.error("Error initializing generative model:", err);
        await prisma.quiz.update({
            where: { id: quizId },
            data: { status: "FAILED" },
        });
        return;
    }

    try {
        const prompt = `You are an expert quiz creator. Based on the following content:
1. First, generate a SHORT, CONCISE TITLE for the quiz (2-3 words only).
2. Then generate exactly ${totalToGenerate} quiz questions: ${types.mcq} Multiple Choice questions and ${types.trueFalse} True/False questions.

The output MUST be a valid JSON object with the following format:
{
  "title": "Your Short Quiz Title",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOption": 0,
      "questionType": "MULTIPLE_CHOICE"
    },
    ...more questions...
  ]
}

For True/False questions, the "options" array must be ["True", "False"].

Content:
---
${fullcontext}
---

Do not include any text outside of the JSON object.`;

        const llmResponse = await model.invoke(prompt);
        const response = llmResponse.content;
        console.log(response);

        let parsedResponse;
        let quizTitle = "Untitled Quiz"; // Default title
        let generatedQuestions = [];

        try {
            console.log("Raw LLM response:", response);
            // Use a regex to extract the JSON string, accounting for variations in markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            let jsonString;
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1].trim();
            } else {
                // If no markdown block is found, assume the entire response is JSON
                jsonString = response.trim();
            }
            console.log("Extracted JSON string:", jsonString);
            parsedResponse = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            await prisma.quiz.update({
                where: { id: quizId },
                data: { status: "FAILED" },
            });
            return;
        }

        if (parsedResponse.title) {
            quizTitle = parsedResponse.title;
        }

        if (Array.isArray(parsedResponse.questions)) {
            generatedQuestions = parsedResponse.questions;

            generatedQuestions.forEach((q) => {
                if (q.questionType === "MULTIPLE_CHOICE") {
                    questionCounts.mcq++;
                } else if (q.questionType === "TRUE_FALSE") {
                    questionCounts.trueFalse++;
                }
            });

            await prisma.quizQuestion.createMany({
                data: generatedQuestions.map((q) => ({
                    quizId,
                    question: q.question,
                    options: q.options,
                    correctOption: q.correctOption,
                    questionType: q.questionType,
                })),
            });
        } else {
            console.error("Generated questions is not an array.");
            await prisma.quiz.update({
                where: { id: quizId },
                data: { status: "FAILED" },
            });
            return;
        }

        await prisma.quiz.update({
            where: { id: quizId },
            data: {
                status: "COMPLETED",
                title: quizTitle,
                currentNos: questionCounts.mcq + questionCounts.trueFalse,
            },
        });
    } catch (error) {
        console.error("Error generating questions:", error);
        await prisma.quiz.update({
            where: { id: quizId },
            data: { status: "FAILED" },
        });
        return;
    }
}