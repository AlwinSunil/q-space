import prisma from "../prisma.js";
import { GoogleGenAI } from "@google/genai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Placeholder for a secure encryption key (NOT FOR PRODUCTION)
// In a real application, this should be a strong, randomly generated key
// stored securely (e.g., in environment variables, KMS, or a secrets manager).
// For demonstration, we'll use a simple placeholder.
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || "supersecretencryptionkey";

// Simple Base64 encoding/decoding for demonstration.
// DO NOT USE IN PRODUCTION FOR SENSITIVE DATA LIKE API KEYS.
// A proper encryption library (e.g., Node.js crypto module with AES-256) should be used.
const encrypt = (text) => Buffer.from(text).toString('base64');
const decrypt = (text) => Buffer.from(text, 'base64').toString('utf8');

export { encrypt, decrypt };

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { learningGoals, academicLevel, interests } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                learningGoals,
                academicLevel,
                interests,
            },
        });

        res.status(200).json({
            success: true,
            message: "User profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update user profile",
            details: error.message,
        });
    }
};

export const saveUserAPIKey = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({ success: false, error: "API key is required" });
        }

        // --- WARNING: INSECURE ENCRYPTION FOR DEMONSTRATION ONLY ---
        // In a production environment, use a robust encryption method (e.g., AES-256)
        // with a securely managed encryption key.
        const encryptedApiKey = encrypt(apiKey);
        // --- END WARNING ---

        let isValid = false;
        console.log(`Received API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);
        try {
            console.log("Attempting to validate API key by listing files...");
            const ai = new GoogleGenAI({ apiKey });
            await ai.files.list(); // Check API access
            console.log("Gemini API access check successful.");

            isValid = true;
        } catch (validationError) {
            console.error("API Key validation failed:", validationError.message);
            console.error("Validation Error Details:", validationError);
            isValid = false;
        }
        console.log(`API Key validation result: isValid = ${isValid}`);
        console.log(`Encrypted API Key (first 5 chars): ${encryptedApiKey.substring(0, 5)}...`);

        const userAPIKeyRecord = await prisma.userAPIKey.upsert({
            where: { userId },
            update: {
                apiKey: encryptedApiKey,
                isValid,
            },
            create: {
                userId,
                apiKey: encryptedApiKey,
                isValid,
            },
        });

        res.status(200).json({
            success: true,
            message: "API key saved and validated",
            isValid: userAPIKeyRecord.isValid,
        });
    } catch (error) {
        console.error("Error saving user API key:", error);
        res.status(500).json({
            success: false,
            error: "Failed to save API key",
            details: error.message,
        });
    }
};