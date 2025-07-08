import express from 'express';
import { 
    submitQuizAttempt, 
    getTestAttemptDetails, 
    getUserTestAttempts,
    startTestAttempt,
    getTestAttemptByQuiz,
    regenerateFeedback
} from '../controllers/testAttempt.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all test attempts for a user
router.get('/user', verifyToken, getUserTestAttempts);

// Get test attempt by quiz ID
router.get('/by-quiz/:id', verifyToken, getTestAttemptByQuiz);

// Get a specific test attempt
router.get('/:id', verifyToken, getTestAttemptDetails);

// Start a new test attempt
router.post('/:id/start', verifyToken, startTestAttempt);

// Submit answers for a test attempt
router.post('/:id/submit', verifyToken, submitQuizAttempt);

// Regenerate feedback for a test attempt
router.get('/:id/regenerate-feedback', verifyToken, regenerateFeedback);

export default router;