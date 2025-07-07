import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { decrypt } from "../controllers/userProfile.js";

// Function to get a Generative AI model instance with a specific API key
export const getGenerativeModel = (apiKey) => {
  // Defensive: Ensure apiKey is a non-empty string before decrypting
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("No API key provided to getGenerativeModel");
  }
  const decrypted = decrypt(apiKey);
  if (!decrypted || typeof decrypted !== "string") {
    throw new Error("Decrypted API key is invalid");
  }
  return new ChatGoogleGenerativeAI({
    apiKey: decrypted,
    model: "gemini-2.0-flash",
    maxOutputTokens: 1000000,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
    ],
  });
};

// Function to get a Google AI File Manager instance with a specific API key
export const getFileManager = (apiKey) => {
  const decryptedKey = decrypt(apiKey);
  console.log(`Decrypted API Key for File Manager (first 5 chars): ${decryptedKey.substring(0, 5)}...`);
  const fileManagerInstance = new GoogleAIFileManager(decryptedKey);
  console.log("File Manager instance created:", fileManagerInstance);
  console.log("File Manager instance methods:", Object.keys(Object.getPrototypeOf(fileManagerInstance)));
  return fileManagerInstance;
};

// Feedback generation: plain LLM call, no tools/agents
export const getFeedbackAgent = (
  apiKey,
  quizQuestions,
  userAnswers,
  correctAnswers,
  score,
  originalContentSummary
) => {
  const model = getGenerativeModel(apiKey);

  // Compose a single prompt with all context
  const prompt = `
You are an expert educational feedback AI. Given the following quiz attempt data, generate a highly structured, interactive, and visually engaging feedback report. Output a single valid JSON object (no markdown, no code blocks, no commentary) with the following structure:

{
  "overallFeedback": "[A concise, positive summary of the user's performance, referencing key strengths and areas for improvement.]",
  "questionFeedback": [
    {
      "questionId": "[ID of the question]",
      "isCorrect": [true/false],
      "explanation": "[Short, clear explanation for the answer. If incorrect, explain why and what is correct.]",
      "concept": "[The main concept or topic tested by this question.]"
    }
  ],
  "recommendations": "[Actionable, encouraging recommendations for improvement. Reference specific concepts or areas within the original content summary.]",
  "graphData": {
    "correct": [number of correct answers],
    "incorrect": [number of incorrect answers],
    "conceptBreakdown": [
      {"concept": "[Concept Name]", "correct": [number], "incorrect": [number]}
    ]
  },
  "interactive": {
    "conceptExplanation": "[Pick one weak concept and explain it simply.]",
    "practiceQuestion": {
      "question": "[A new question on the weak concept]",
      "options": ["A", "B", "C", "D"],
      "correctIndex": [0-3],
      "explanation": "[Short explanation of the correct answer]"
    }
  }
}

DO NOT include any markdown, code blocks, or extra commentary. Output ONLY the JSON object.

Quiz Questions: ${JSON.stringify(quizQuestions, null, 2)}
User Answers: ${JSON.stringify(userAnswers, null, 2)}
Correct Answers: ${JSON.stringify(correctAnswers, null, 2)}
Score: ${score}
Original Content Summary: ${originalContentSummary}
`;

  // Return an object with an invoke method for compatibility
  return {
    invoke: async () => {
      const response = await model.invoke(prompt);
      // For compatibility with previous agent interface
      return { output: response.content };
    }
  };
};