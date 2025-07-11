import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import Navbar from "../components/navbar";
import axiosInstance from "../axiosInstance";

export default function QuizPage() {
    const { id } = useParams();

    const [mode, setMode] = useState("Workout"); // "Workout" or "Prepare"
    const [questions, setQuestions] = useState([]);
    const [result, setResult] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Add state to store the test attempt ID
    const [testAttemptId, setTestAttemptId] = useState(null);

    useEffect(() => {
        let pollingInterval;

        const fetchQuiz = async () => {
            try {
                const response = await axiosInstance.get(`/quiz/${id}`);
                const quiz = response.data.quiz;

                setResult(response.data);
                setQuestions(quiz.quizQuestions);
                setLoading(false);

                // Stop polling if quiz is completed or failed
                if (quiz.status === "COMPLETED" || quiz.status === "FAILED") {
                    clearInterval(pollingInterval);
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
                setError(error.response?.data?.error || "Failed to load quiz");
                setLoading(false);
                clearInterval(pollingInterval); // Stop polling on error
            }
        };

        fetchQuiz(); // Initial fetch

        // Set up polling every 3 seconds
        pollingInterval = setInterval(fetchQuiz, 3000);

        // Cleanup interval on component unmount
        return () => clearInterval(pollingInterval);
    }, [id]);

    // Add this effect to create a test attempt if it doesn't exist
    useEffect(() => {
        const ensureTestAttempt = async () => {
            try {
                // Try to fetch the test attempt for this quiz and user
                console.log(`Fetching test attempt for quiz: ${id}`);
                
                try {
                    const resp = await axiosInstance.get(`/test-attempts/by-quiz/${id}`);
                    if (resp.data.testAttempt) {
                        console.log("Found existing test attempt:", resp.data.testAttempt.id);
                        // Store the test attempt ID if found
                        setTestAttemptId(resp.data.testAttempt.id);
                        return; // Exit early if found
                    }
                } catch (fetchErr) {
                    console.warn("Could not fetch test attempts, will try to create a new one:", fetchErr.message);
                    // Continue to creation step
                }
                
                // If not found or error occurred, create a new test attempt
                console.log("Creating new test attempt for quiz:", id);
                const createResp = await axiosInstance.post(`/test-attempts/${id}/start`);
                if (createResp.data.success && createResp.data.testAttempt) {
                    console.log("Created new test attempt:", createResp.data.testAttempt.id);
                    setTestAttemptId(createResp.data.testAttempt.id);
                } else {
                    console.error("Failed to create test attempt:", createResp.data);
                    throw new Error("Failed to create test attempt");
                }
            } catch (e) {
                console.error("Error ensuring test attempt:", e);
                setError("Failed to initialize quiz. Please try again.");
            }
        };
        
        if (id) {
            ensureTestAttempt();
        }
    }, [id]);

    const handleAnswerClick = (qIdx, optionIdx) => {
        if (mode !== "Workout") return;
        setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optionIdx }));
    };

    const handleSubmitQuiz = async () => {
        setSubmitting(true);
        try {
            // Use testAttemptId instead of quiz id
            if (!testAttemptId) {
                throw new Error("No active test attempt found. Please refresh the page.");
            }
            
            console.log("Submitting answers for test attempt:", testAttemptId);
            const formattedAnswers = Object.keys(selectedAnswers).map(qIdx => ({
                quizQuestionId: questions[qIdx].id,
                selectedOptionIndex: selectedAnswers[qIdx]
            }));

            console.log("Formatted answers:", JSON.stringify(formattedAnswers));
            
            const response = await axiosInstance.post(`/test-attempts/${testAttemptId}/submit`, {
                userAnswers: formattedAnswers
            });

            if (response.data.success) {
                navigate(`/test-results/${response.data.testAttemptId}`);
            } else {
                setError(response.data.error || "Failed to submit quiz.");
            }
        } catch (err) {
            console.error("Error submitting quiz:", err);
            setError(
                err.response?.data?.error || 
                err.message || 
                "Failed to submit quiz. Please check your connection and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const getOptionClass = (q, qIdx, optionIdx) => {
        const base = "border rounded-md px-4 py-2 text-sm cursor-pointer";
        if (mode === "Prepare") {
            return q.correctOption === optionIdx
                ? `${base} border border-blue-400 bg-blue-50`
                : `${base} border-gray-300`;
        }
        if (selectedAnswers[qIdx] !== undefined) {
            if (selectedAnswers[qIdx] === optionIdx) {
                return q.correctOption === optionIdx
                    ? `${base} border border-green-400 bg-green-50`
                    : `${base} border border-red-400 bg-red-50`;
            } else if (q.correctOption === optionIdx) {
                return `${base} border border-green-400 bg-green-50`;
            }
        }
        return `${base} border-gray-300`;
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-96px)]">
                    <div className="text-sm text-gray-500">Loading quiz...</div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-96px)]">
                    <div className="text-sm text-red-500">{error}</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="flex flex-col items-center min-h-[calc(100vh-64px)] gap-6">
                <div className="max-w-xl w-full items-center mt-16 flex">
                    <div className="max-w-xl w-full items-center flex">
                        <span className="font-medium text-xs">Mode</span>
                        <div className="flex ml-3 items-center text-xs">
                            <button
                                onClick={() => setMode("Workout")}
                                className={`px-4 pr-3 py-1 rounded-l-full ${mode === "Workout" ? "bg-blue-500 border border-blue-500 text-white" : "bg-white border border-r-0 border-gray-300"}`}
                            >
                                Workout
                            </button>
                            <button
                                onClick={() => setMode("Prepare")}
                                className={`px-4 pl-3 py-1 rounded-r-full ${mode === "Prepare" ? "bg-blue-500 border border-blue-500 text-white" : "bg-white border border-l-0 border-gray-300"}`}
                            >
                                Prepare
                            </button>
                        </div>
                    </div>
                    {result?.quiz && (
                        <span
                            className={clsx(
                                "font-medium text-xs ml-auto border px-2 py-0.5 rounded",
                                result.quiz.status === "COMPLETED" &&
                                    "text-green-500 bg-green-50",
                                result.quiz.status === "STARTING" &&
                                    "text-yellow-500 bg-yellow-50",
                                result.quiz.status === "GENERATING" &&
                                    "text-blue-500 bg-blue-50",
                                result.quiz.status === "FAILED" &&
                                    "text-red-500 bg-red-50"
                            )}
                        >
                            {result.quiz.status}
                        </span>
                    )}
                </div>
                {questions.length > 0 ? (
                    <div className="flex flex-col gap-6 w-full mt-4 max-w-xl">
                        {questions.map((q, qIdx) => (
                            <div key={q.id}>
                                <div className="flex flex-col gap-4">
                                    <p className="font-medium text-xl">
                                        {q.question}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {q.options.map((option, i) => (
                                            <div
                                                className={getOptionClass(
                                                    q,
                                                    qIdx,
                                                    i
                                                )}
                                                key={i}
                                                onClick={() =>
                                                    handleAnswerClick(qIdx, i)
                                                }
                                            >
                                                {option}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <hr className="border-gray-200 border-2 last:mb-12 last:border-none mt-6" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center mt-8">
                        <div className="text-sm text-gray-500">
                            Waiting for questions...
                        </div>
                    </div>
                )}
                {mode === "Workout" && questions.length > 0 && (
                    <button
                        onClick={handleSubmitQuiz}
                        disabled={submitting || Object.keys(selectedAnswers).length !== questions.length}
                        className={clsx(
                            "mt-8 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-medium",
                            (submitting || Object.keys(selectedAnswers).length !== questions.length) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {submitting ? "Submitting..." : "Submit Quiz"}
                    </button>
                )}
                
                {/* Progress indicator */}
                {mode === "Workout" && questions.length > 0 && (
                    <div className="mt-4 w-full max-w-xl px-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{Object.keys(selectedAnswers).length} of {questions.length} answered</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}