import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

async function verifyToken(req, res, next) {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log("Token decoded:", decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userAPIKey: {
          select: {
            isValid: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    req.user = {
      userId: user.id,
      googleId: user.googleId,
      learningGoals: user.learningGoals,
      academicLevel: user.academicLevel,
      interests: user.interests,
      apiKey: user.userAPIKey ? user.userAPIKey.apiKey : null,
      apiKeyIsValid: user.userAPIKey ? user.userAPIKey.isValid : false,
    };
    console.log("User API Key from DB in verifyToken:", user.userAPIKey);
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).send("Unauthorized");
  }
}

export default verifyToken;
