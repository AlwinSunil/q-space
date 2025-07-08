import { getGenerativeModel } from "../services/ai.js";

export async function generateFeedback(apiKey, quizQuestions, userAnswers, score, originalContent) {
  try {
    // Create a mapping of question IDs to their content and correct answers
    const questionsMap = quizQuestions.reduce((acc, q) => {
      acc[q.id] = {
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
      };
      return acc;
    }, {});

    // Prepare data for the AI request
    const feedbackData = {
      quizQuestions: quizQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
      })),
      userAnswers: userAnswers.map((ua) => ({
        quizQuestionId: ua.quizQuestionId,
        selectedOptionIndex: ua.selectedOptionIndex,
        isCorrect:
          ua.selectedOptionIndex === questionsMap[ua.quizQuestionId]?.correctOption,
      })),
      score,
    };

    // Create the model and generate feedback
    const model = getGenerativeModel(apiKey);
    
    // Build the prompt
    const prompt = `You are an expert educational feedback AI. Given the following quiz attempt data, generate a structured, interactive, and engaging feedback report. Output a valid JSON object with this structure:

{
  "overallFeedback": "A concise summary of performance, strengths, and areas for improvement",
  "questionFeedback": [
    {
      "questionId": "the question id",
      "isCorrect": true/false,
      "explanation": "Explanation for why the answer is right/wrong",
      "concept": "The main concept being tested"
    }
  ],
  "recommendations": "Actionable suggestions for improvement",
  "graphData": {
    "correct": number,
    "incorrect": number,
    "conceptBreakdown": [
      {"concept": "Concept Name", "correct": number, "incorrect": number}
    ]
  },
  "interactive": {
    "conceptExplanation": "Explanation of a weak concept",
    "practiceQuestion": {
      "question": "A practice question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0-3,
      "explanation": "Why this answer is correct"
    }
  }
}

Quiz Questions: ${JSON.stringify(feedbackData.quizQuestions, null, 2)}
User Answers: ${JSON.stringify(feedbackData.userAnswers, null, 2)}
Score: ${score}
Original Content: ${originalContent ? originalContent.substring(0, 3000) : "No content provided"}`;

    // Call the model
    const response = await model.invoke(prompt);
    console.log("Raw agent output:", response.content);

    // Parse the response, handling code blocks if present
    let parsedFeedback;
    try {
      // Extract JSON from code blocks if present
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let jsonString;

      if (jsonMatch && jsonMatch[1]) {
        // Found JSON in code block
        jsonString = jsonMatch[1].trim();
      } else {
        // Try parsing the whole response
        jsonString = response.content.trim();
      }

      parsedFeedback = JSON.parse(jsonString);
      
      // Validate that the feedback has the expected structure
      if (!parsedFeedback.overallFeedback || !Array.isArray(parsedFeedback.questionFeedback)) {
        throw new Error("Invalid feedback structure");
      }
      
      return parsedFeedback;
      
    } catch (error) {
      console.error("Error parsing feedback:", error);
      // If parsing fails, return a basic feedback object
      return {
        debug: response.content, // Store the raw response for debugging
        overallFeedback: "Failed to generate detailed feedback. Invalid JSON from AI.",
        questionFeedback: [],
        recommendations: "Please try again later."
      };
    }
  } catch (error) {
    console.error("Error generating feedback:", error);
    return {
      overallFeedback: "An error occurred while generating feedback.",
      questionFeedback: [],
      recommendations: "Please try again later."
    };
  }
}