import express from "express";
import jwt from "jsonwebtoken";

import prisma from "../prisma.js";
import { google, oauth2Client, SCOPES } from "../services/googleapis.js";

const router = express.Router();

async function upsertUserWithGoogleAuth(userData, tokens) {
    try {
        const {
            id: googleId,
            email,
            verified_email: emailVerified,
            given_name: firstName,
            family_name: lastName,
            name: displayName,
            picture: profileImage,
        } = userData;

        const {
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: idToken,
            token_type: tokenType,
            scope,
            expiry_date: expiryDateMs,
        } = tokens;

        const expiryDate = expiryDateMs
            ? new Date(expiryDateMs)
            : new Date(Date.now() + 3600 * 1000);

        return prisma.$transaction(async (tx) => {
            // Create or update user
            const user = await tx.user.upsert({
                where: { googleId },
                update: {
                    email,
                    emailVerified,
                    firstName,
                    lastName,
                    displayName,
                    profileImage,
                },
                create: {
                    googleId,
                    email,
                    emailVerified,
                    firstName,
                    lastName,
                    displayName,
                    profileImage,
                },
            });

            // Create or update auth tokens
            await tx.googleAuth.upsert({
                where: { userId: user.id },
                update: {
                    accessToken,
                    refreshToken: refreshToken ?? null,
                    idToken,
                    tokenType,
                    scope,
                    expiryDate,
                },
                create: {
                    userId: user.id,
                    accessToken,
                    refreshToken: refreshToken ?? null,
                    idToken,
                    tokenType,
                    scope,
                    expiryDate,
                },
            });

            return user;
        });
    } catch (error) {
        console.error("Error in upsertUserWithGoogleAuth:", error);
        throw new Error("Failed to update or create user.");
    }
}

router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        redirect_uri: process.env.GOOGLE_REDIRECT_URL,
    });
    console.log("Redirecting to:", url);
	res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
    const { code } = req.query;
    console.log("Authorization code:", code);

    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log("Tokens received:", tokens);

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        console.log("User info:", userInfo.data);

        const user = await upsertUserWithGoogleAuth(userInfo.data, tokens);
        console.log("User:", user);

        const accessToken = jwt.sign(
            { userId: user.id, googleId: user.googleId },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "15m" }
        );
        const refreshToken = jwt.sign(
            { userId: user.id, googleId: user.googleId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "none",
            domain: process.env.COOKIE_DOMAIN,
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: "none",
            domain: process.env.COOKIE_DOMAIN,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.redirect(`${process.env.CLIENT_URL}/new`);
    } catch (error) {
        console.error("Error during authentication:", error);
        return res.status(500).send("Authentication failed");
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("accessToken", {
        sameSite: "none",
        secure: true,
        domain: process.env.COOKIE_DOMAIN,
    });
    res.clearCookie("refreshToken", {
        sameSite: "none",
        domain: process.env.COOKIE_DOMAIN,
        secure: true,
    });
    res.status(200).json({ message: "Logged out successfully" });
});

// Add new token refresh endpoint
router.post("/token", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res
                .status(401)
                .json({ message: "No refresh token provided" });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newAccessToken = jwt.sign(
            { userId: user.id, googleId: user.googleId },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            sameSite: "none",
            domain: process.env.COOKIE_DOMAIN,
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return res.json({ message: "Access token refreshed" });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }
        console.error("Token refresh error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/", async (req, res) => {
    try {
        // Verify access token from cookies
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.json({ authenticated: false });
        }

        // Verify JWT and get user data
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

        // Get complete user data from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                profileImage: true,
                createdAt: true,
                learningGoals: true,
                academicLevel: true,
                interests: true,
                userAPIKey: {
                    select: {
                        isValid: true,
                    },
                },
                quizzes: {
                    select: {
                        id: true,
                        status: true,
                        currentNos: true,
                        maxNos: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!user) {
            return res.json({ authenticated: false });
        }

        res.json({
            authenticated: true,
            user: {
                ...user,
                quizCount: user.quizzes.length,
                onGoingGeneration: user.quizzes.filter(
                    (q) => q.status === "GENERATING"
                ),
            },
        });
    } catch (error) {
        console.error("Auth check failed:", error);
        res.json({ authenticated: false });
    }
});

export default router;
