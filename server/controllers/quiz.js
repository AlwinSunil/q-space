import prisma from "../prisma.js";
import fs from "fs/promises";
import path from "path";

import { generateAndStoreQuestions } from "../utils/quiz.js"; // Import the function
import axios from "axios";

import { convertMarkdownToPlainText } from "../utils/markdown.js";
import { getGenerativeModel } from "../services/ai.js";
import { ensureTempDir, uploadToGemini, getGeminiCaption, extractYouTubeVideoId, getYouTubeCaptions, getYouTubeSummary } from "../utils/processing.js";
import { generateFeedback } from "../utils/feedback.js";


export const getUserQuizzes = async (req, res) => {
    try {
        const userId = req.user.userId;

        const quizzes = await prisma.quiz.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({
            success: true,
            quizzes,
        });
    }
    catch (error) {
        console.error("Error fetching user quizzes:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user quizzes",
            details: error.message,
        });
    }
};

export const getQuiz = async (req, res) => {
	try {
		const quizId = req.params.id;

		// First, make sure the quiz exists
		const quiz = await prisma.quiz.findUnique({
			where: { id: quizId },
		});

		console.log(quiz)

		if (!quiz) {
			return res.status(404).json({
				success: false,
				error: "Quiz does not exist",
			});
		}

		// Get all quizQuestions for the quiz
		const quizQuestions = await prisma.quizQuestion.findMany({
			where: { quizId },
			orderBy: { createdAt: "asc" },
		});

		// Return quiz details along with the quiz questions
		return res.status(200).json({
			success: true,
			quiz: { ...quiz, quizQuestions },
		});
	} catch (error) {
		console.error("Error fetching quiz:", error);
		return res.status(500).json({
			success: false,
			error: "Failed to fetch quiz",
			...(process.env.NODE_ENV === "development" && {
				details: error.message,
			}),
		});
	}
};



export const createQuiz = async (req, res) => {
	try {
		// Parse the config from form data
		const config = JSON.parse(req.body.config);
		const { title, originalContentSummary } = req.body; // New: Get title and originalContentSummary from body

		// Extract user ID from the nested JWT payload
		const userId = req.user.userId;
		const { totalQuestions, types } = config;

		// Validation
		if (!req.files?.length || !totalQuestions || !userId) {
			return res.status(400).json({
				error:
					"Missing required fields: " +
					(!req.files?.length ? "files, " : "") +
					(!totalQuestions ? "totalQuestions, " : "") +
					(!userId ? "userId" : ""),
			});
		}

		// Add user existence check and fetch user profile data
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { userAPIKey: true }, // Include userAPIKey
		});

		if (!user) {
			return res.status(404).json({
				error: "User not found",
			});
		}

		// Check user's API key validity
		if (!user.userAPIKey || !user.userAPIKey.isValid || !user.userAPIKey.apiKey) {
			return res.status(403).json({
				error: "A valid Google API key is required to create quizzes. Please set it in your profile.",
			});
		}

		// Create quiz record
		const quiz = await prisma.quiz.create({
			data: {
				userId: String(userId),
				title: title || null, // Populate title
				maxNos: parseInt(totalQuestions),
				status: "STARTING",
				config: {
					totalQuestions,
					types,
				},
				originalContentSummary: originalContentSummary || null, // Populate summary
			},
		});

		// Create permanent storage directory
		const quizDir = path.join(process.cwd(), "uploads/files", quiz.id);
		await fs.mkdir(quizDir, { recursive: true });
		await ensureTempDir(); // Ensure temp directory exists for image processing

		// This variable will accumulate all processed plain text content.
		let fullcontext = "";

		// Process each file
		for (const file of req.files) {
			// Get file extension and determine if it's markdown by checking the extension
			const fileExt = path.extname(file.originalname).toLowerCase();
			const isMarkdown = fileExt === ".md";
			const newFilePath = path.join(quizDir, path.basename(file.path));

			if (isMarkdown) {
				console.log(`Processing markdown file: ${file.originalname}`);
				try {
					// Read the markdown content
					let mdContent = await fs.readFile(file.path, "utf8");

					// Process Images
					const imageRegex = /!\[(.*?)\]\((https?:\/\/.*?)\)/g;
					const imageMatches = [...mdContent.matchAll(imageRegex)];

					// Array to store details for each image
					let imagesArray = [];
					for (const match of imageMatches) {
						const fullMatch = match[0];
						const imageUrl = match[1];
						console.log("Found image URL:", imageUrl);
						try {
							const response = await axios.get(imageUrl, {
								responseType: "arraybuffer",
							});
							const imageData = response.data; // Buffer
							// Create a unique temporary file name in tempDir
							const filename = `${Date.now()}-${path.basename(
								new URL(imageUrl).pathname
							)}`;
							const tempImagePath = path.join(tempDir, filename);
							await fs.writeFile(tempImagePath, imageData);
							console.log(
								"Saved temporary image:",
								tempImagePath
							);
							// Determine mime type (simple heuristic)
							let mimeType = "image/jpeg";
							if (imageUrl.endsWith(".png"))
								mimeType = "image/png";
							else if (imageUrl.endsWith(".gif"))
								mimeType = "image/gif";
							imagesArray.push({
								markdown: fullMatch,
								imageUrl,
								tempImagePath,
								mimeType,
							});
						} catch (err) {
							console.error(
								"Error downloading image:",
								imageUrl,
								err
							);
						}
					}

					// Process Images with timing
					for (const img of imagesArray) {
						console.time(`Image Processing: ${img.imageUrl}`);
						const caption = await getGeminiCaption(req.user.apiKey, img.tempImagePath, img.mimeType);
						console.timeEnd(`Image Processing: ${img.imageUrl}`);
						console.log("Gemini caption:", caption);
						mdContent = mdContent.replace(
							img.markdown,
							`image to text: ${caption}`
						);
						try {
							await fs.unlink(img.tempImagePath);
						} catch (err) {
							console.error(
								"Error deleting temporary image file:",
								img.tempImagePath,
								err
							);
						}
					}

					// Process YouTube Links (standard links)
					const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
					const youtubeMatches = [
						...mdContent.matchAll(youtubeRegex),
					];

					// Process each YouTube link with timing
					for (const match of youtubeMatches) {
						console.time(`YouTube Processing: ${match[0]}`);
						const fullMatch = match[0];
						console.log("Found YouTube URL:", fullMatch);

						// Get summary for the YouTube video
						const summary = await getYouTubeSummary(req.user.apiKey, fullMatch);
						console.log("YouTube TextBook:", summary);

						// Replace the YouTube link with the summary
						mdContent = mdContent.replace(
							fullMatch,
							`Video TextBook: ${summary}`
						);
						console.timeEnd(`YouTube Processing: ${match[0]}`);
					}

					// Process custom YouTube components
					const customYoutubeRegex = /<Youtube\s+videoId=['"]([^'"]+)['"](?:\s+start=['"]([^'"]+)['"])?(?:\s+end=['"]([^'"]+)['"])?.*?\/>/g;
					const customYoutubeMatches = [
						...mdContent.matchAll(customYoutubeRegex),
					];

					// Process each custom YouTube component with timing
					for (const match of customYoutubeMatches) {
						console.time(`Custom YouTube Processing: ${match[1]}`);
						const fullMatch = match[0];
						const videoId = match[1]; // This captures the videoId value
						const startTime = match[2] || null; // Start time or null if not specified
						const endTime = match[3] || null; // End time or null if not specified

						console.log(
							`Found Custom YouTube Component, videoId: ${videoId}, start: ${startTime}, end: ${endTime}`
						);

						// Construct a standard YouTube URL to use with your existing function
						const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

						// Get transcript with time restrictions
						const transcript = await getYouTubeCaptions(
							videoId,
							startTime,
							endTime
						);

						// Define the prompt based on whether we have a transcript
						let prompt;
						if (transcript) {
							prompt = `I have a partial transcript from a YouTube video (ID: ${videoId}). Please provide a detailed textbook-style of the content.\n              \nTRANSCRIPT:\n${transcript.substring(0, 25000)} // Limit to 25K chars in case of very long videos\n              \nPlease Text Book the key points, main ideas, and important details from this video segment in formal, textbook-like language. Make the comprehensive but concise.\n            \nOutput:\n"TextBook Content: {content} "`;
						} else {
							prompt = `Please provide a summary of the YouTube video segment with ID: ${videoId} at URL: ${youtubeUrl} from timestamp ${startTime || "start"} to ${endTime || "end"}.\n              Focus on the main topics, key points, and overall content of this video segment.\n              If you don\'t have access to the video\'s content, please state that and provide a general description of what the video might be about based on its URL.\n              \noutput:\n"TextBook Content: {content} "`;
						}

						// Time the Gemini API call
						console.time("Gemini Custom YouTube API Call");
						const response = await getGenerativeModel(req.user.apiKey).invoke([["human", prompt]]);
						console.timeEnd("Gemini Custom YouTube API Call");

						// Replace the YouTube component with the summary
						mdContent = mdContent.replace(
							fullMatch,
							`Video summary (${startTime || "start"} to ${endTime || "end"}): ${response.content}`
						);
						console.timeEnd(
							`Custom YouTube Processing: ${videoId}`
						);
					}

					// Convert markdown to plain text
					const plainTextContent =
						convertMarkdownToPlainText(mdContent);

					// Save the processed content to the quiz directory
					const processedFilePath = path.join(
						quizDir,
						`${path.basename(file.path, fileExt)}.txt`
					);
					await fs.writeFile(processedFilePath, plainTextContent);

					// Append the plain text content to the full context
					fullcontext += plainTextContent + "\n";
				} catch (err) {
					console.error(
						`Error processing markdown file ${file.originalname}:`,
						err
					);
					// If processing fails, just move the original file
					await fs.rename(file.path, newFilePath);
				}
			} else {
				console.log(`Moving non-markdown file: ${file.originalname}`);
				await fs.rename(file.path, newFilePath);

				// Check if it's a text file by extension
				const textFileExtensions = [".txt"];
				const isTextFile = textFileExtensions.includes(fileExt);

				if (isTextFile) {
					try {
						// Read from the new file location
						const textContent = await fs.readFile(
							newFilePath,
							"utf8"
						);
						console.log(
							`Text content of ${file.originalname}:`,
							textContent.substring(0, 200) + "..."
						);
						// Append the text content to the full context
						fullcontext += textContent + "\n";
					} catch (err) {
						console.error(
							`Error reading text file ${file.originalname}:`,
							err
						);
					}
				}
			}
		}

		// (Optional) Log the full accumulated context
		console.log("Full Context:", fullcontext);

		// Start generating questions asynchronously
		generateAndStoreQuestions(
			quiz.id,
			fullcontext,
			config,
			user.userAPIKey.apiKey, // <-- Always use the user's API key from DB
			user
		)
			.then(() => {
				console.log(
					`Questions generated and stored for quiz ${quiz.id}`
				);
			})
			.catch((error) => {
				console.error(
					`Error generating questions for quiz ${quiz.id}:`,
					error
				);
			});

		return res.status(201).json({
			success: true,
			quizId: quiz.id,
			config: quiz.config,
			fullcontext,
		});
	} catch (error) {
		console.error("Quiz creation error:", error);

		// Cleanup uploaded files on error
		if (req.files) {
			await Promise.all(
				req.files.map(async (file) => {
					try {
						await fs.unlink(file.path);
					} catch (err) {
						console.error("Error cleaning up file:", err);
					}
				})
			);
		}

		return res.status(500).json({
			success: false,
			error: "Failed to create quiz",
			...(process.env.NODE_ENV === "development" && {
				details: error.message,
			}),
		});
	}
};

export const getQuizFeedback = async (req, res) => {
    try {
        const quizId = req.params.id;
        let userId = req.user && req.user.userId ? req.user.userId : null;

        // Try to get userId from testAttempt if not present in req.user
        let testAttempt = null;
        if (!userId && req.query.testAttemptId) {
            testAttempt = await prisma.testAttempt.findUnique({
                where: { id: req.query.testAttemptId },
            });
            if (testAttempt && testAttempt.userId) {
                userId = testAttempt.userId;
            }
        }

        // Fetch quiz and its questions
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { quizQuestions: true },
        });
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        // --- Fetch full content context if available ---
        let fullContent = "";
        try {
            const quizDir = path.join(process.cwd(), "uploads/files", quiz.id);
            const files = await fs.readdir(quizDir);
            // Concatenate all .txt files for full context
            const txtFiles = files.filter(f => f.endsWith(".txt"));
            if (txtFiles.length > 0) {
                const contents = await Promise.all(
                    txtFiles.map(f => fs.readFile(path.join(quizDir, f), "utf8"))
                );
                fullContent = contents.join("\n\n");
            }
        } catch (e) {
            fullContent = quiz.originalContentSummary || "";
        }

        // --- DEBUG: Log userId and userAPIKey ---
        console.log("getQuizFeedback: userId used:", userId);

        // Defensive: Only fetch userAPIKey if userId is present
        let userAPIKey = null;
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { userAPIKey: true },
            });
            console.log("getQuizFeedback: user from DB:", user);
            if (user && user.userAPIKey && user.userAPIKey.isValid && user.userAPIKey.apiKey) {
                userAPIKey = user.userAPIKey;
            }
        }
        // --- DEBUG: Log userAPIKey ---
        console.log("getQuizFeedback: userAPIKey used:", userAPIKey);

        if (!userAPIKey || !userAPIKey.isValid || !userAPIKey.apiKey) {
            return res.status(403).json({ error: "Valid Google API key is required to generate feedback." });
        }

        // --- Use actual user answers if testAttemptId is provided ---
        let userAnswers;
        if (req.query.testAttemptId) {
            if (!testAttempt) {
                testAttempt = await prisma.testAttempt.findUnique({
                    where: { id: req.query.testAttemptId },
                });
            }
            if (testAttempt && testAttempt.userAnswers) {
                userAnswers = testAttempt.userAnswers.map(ua => ({
                    quizQuestionId: ua.quizQuestionId,
                    selectedOptionIndex: ua.selectedOptionIndex,
                    isCorrect: ua.isCorrect,
                }));
            }
        }
        // Fallback: simulate empty answers if not found
        if (!userAnswers) {
            userAnswers = quiz.quizQuestions.map(q => ({
                quizQuestionId: q.id,
                selectedOptionIndex: null,
                isCorrect: false,
            }));
        }

        const quizQuestions = quiz.quizQuestions;
        const correctAnswers = quizQuestions.map(q => q.correctOption);

        // Calculate score if userAnswers are present
        let score = 0;
        if (userAnswers && userAnswers.length > 0) {
            let correct = 0;
            for (let i = 0; i < quizQuestions.length; i++) {
                const ua = userAnswers.find(ans => ans.quizQuestionId === quizQuestions[i].id);
                if (ua && ua.selectedOptionIndex === quizQuestions[i].correctOption) {
                    correct++;
                }
            }
            score = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 100) : 0;
        }

        // Use fullContent as the context for feedback
        const feedback = await generateFeedback(
            userAPIKey.apiKey,
            quizQuestions,
            userAnswers,
            score,
            fullContent // <-- send full content, not just summary
        );
        res.json({ feedback });
    } catch (err) {
        console.error("Error in getQuizFeedback:", err);
        res.status(500).json({ error: "Failed to generate feedback" });
    }
};

// Add this helper to generate and store feedback after quiz submission
async function generateAndStoreFeedbackForTestAttempt(testAttemptId) {
    // Fetch the test attempt, quiz, and user
    const testAttempt = await prisma.testAttempt.findUnique({
        where: { id: testAttemptId },
        include: { quiz: { include: { quizQuestions: true } } }
    });
    if (!testAttempt || !testAttempt.quiz) return;

    // Get user API key
    const user = await prisma.user.findUnique({
        where: { id: testAttempt.userId },
        include: { userAPIKey: true }
    });
    if (!user || !user.userAPIKey || !user.userAPIKey.isValid || !user.userAPIKey.apiKey) return;

    // Get full content context
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

    // Prepare userAnswers in the same format as getQuizFeedback
    const userAnswers = testAttempt.userAnswers.map(ua => ({
        quizQuestionId: ua.quizQuestionId,
        selectedOptionIndex: ua.selectedOptionIndex,
        isCorrect: ua.isCorrect,
    }));

    // Calculate score
    const quizQuestions = testAttempt.quiz.quizQuestions;
    let correct = 0;
    for (let i = 0; i < quizQuestions.length; i++) {
        const ua = userAnswers.find(ans => ans.quizQuestionId === quizQuestions[i].id);
        if (ua && ua.selectedOptionIndex === quizQuestions[i].correctOption) {
            correct++;
        }
    }
    const score = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 100) : 0;

    // Generate feedback
    const feedback = await generateFeedback(
        user.userAPIKey.apiKey,
        quizQuestions,
        userAnswers,
        score,
        fullContent
    );

    // Store feedback in the testAttempt
    await prisma.testAttempt.update({
        where: { id: testAttemptId },
        data: { feedback }
    });
}

// In your test-attempts submit endpoint/controller (not shown in your prompt), after storing user answers and calculating score, call: