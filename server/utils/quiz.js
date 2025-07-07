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
        const prompt = `You are an expert quiz creator. Based on the following content, generate exactly ${totalToGenerate} quiz questions: ${types.mcq} Multiple Choice questions and ${types.trueFalse} True/False questions.

The output MUST be a valid JSON array of question objects. Each object must have the following format:
{
  "question": "The question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctOption": 0,
  "questionType": "MULTIPLE_CHOICE"
}

For True/False questions, the "options" array must be ["True", "False"].

Content:
---
${fullcontext}
---

Do not include any text outside of the JSON array.`;

        const llmResponse = await model.invoke(prompt);
        const response = llmResponse.content;
        console.log(response);

        let generatedQuestions;
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
            generatedQuestions = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            await prisma.quiz.update({
                where: { id: quizId },
                data: { status: "FAILED" },
            });
            return;
        }

        if (Array.isArray(generatedQuestions)) {
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
    } catch (error) {
        console.error("Error generating questions:", error);
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
            currentNos: questionCounts.mcq + questionCounts.trueFalse,
        },
    });
}