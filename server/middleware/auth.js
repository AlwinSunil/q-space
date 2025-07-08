import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookie OR Authorization header (support both methods)
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log('Token decoded:', decoded);
    
    // Check if user has a valid API key
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }, // Fixed: Added the where clause
      include: { userAPIKey: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Store API key validity for rate limiting and permissions
    const apiKeyValid = user.userAPIKey?.isValid || false;
    console.log('User API Key from DB in verifyToken:', { isValid: apiKeyValid });

    // Attach user data to request
    req.user = {
      userId: user.id,
      googleId: user.googleId,
      learningGoals: user.learningGoals,
      academicLevel: user.academicLevel,
      interests: user.interests,
      apiKey: user.userAPIKey ? user.userAPIKey.apiKey : null,
      apiKeyIsValid: apiKeyValid
    };

    next();
  } catch (error) {
    console.error('Error in verifyToken middleware:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Also export as default for backward compatibility
export default verifyToken;
