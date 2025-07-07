import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { DynamicTool } from "@langchain/core/tools";
import { pull } from "langchain/hub";

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

// Placeholder for feedback agent
export const getFeedbackAgent = async (
  apiKey,
  quizQuestions,
  userAnswers,
  correctAnswers,
  score,
  originalContentSummary
) => {
  const model = getGenerativeModel(apiKey);

  // Fix: Some versions of langchain expect .name to be an own property (not just a getter on the prototype).
  // We'll set .name as an own property and ensure no undefined tools.
  function ensureOwnName(tool) {
    // Defensive: skip undefined/null
    if (!tool) return null;
    // Defensive: skip if .name is missing or not a string
    const name = tool.name;
    if (!name || typeof name !== "string") return null;
    // If already an own property, return as is
    if (Object.prototype.hasOwnProperty.call(tool, "name")) return tool;
    // Copy all properties and explicitly set .name as own property
    const wrapped = Object.create(Object.getPrototypeOf(tool));
    Object.assign(wrapped, tool);
    wrapped.name = name;
    return wrapped;
  }

  const tools = [
    new DynamicTool({
      name: "get_original_content_summary",
      description: "Call this to get the summary of the original content used for quiz generation.",
      func: async (input) => {
        return originalContentSummary;
      },
    }),
    new DynamicTool({
      name: "get_quiz_questions",
      description: "Call this to get the details of the quiz questions.",
      func: async (input) => {
        return JSON.stringify(quizQuestions);
      },
    }),
    new DynamicTool({
      name: "get_user_answers",
      description: "Call this to get the user's submitted answers.",
      func: async (input) => {
        return JSON.stringify(userAnswers);
      },
    }),
    new DynamicTool({
      name: "get_correct_answers",
      description: "Call this to get the correct answers for the quiz questions.",
      func: async (input) => {
        return JSON.stringify(correctAnswers);
      },
    }),
  ]
    .map(ensureOwnName)
    .filter(Boolean); // Remove any null/undefined tools

  // Enhanced prompt for structured, interactive, and graphical feedback
  const prompt = `
You are an expert educational feedback AI. Your task is to provide a highly structured, interactive, and visually engaging feedback report on a user's quiz attempt. Use the provided tools to access quiz questions, user answers, correct answers, and the original content summary.

Your output must be a single valid JSON object (no markdown, no code blocks, no commentary) with the following structure:

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
`;

  const agent = await createReactAgent({
    llm: model,
    tools,
    prompt,
  });

  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: true,
  });
};