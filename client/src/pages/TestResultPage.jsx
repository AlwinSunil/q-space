import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import clsx from "clsx";
import { CheckCircle, XCircle } from "lucide-react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default function TestResultPage() {
  const { id } = useParams();
  const [testAttempt, setTestAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualFeedbackLoading, setManualFeedbackLoading] = useState(false);
  const [manualFeedbackResult, setManualFeedbackResult] = useState(null);
  const [manualFeedbackError, setManualFeedbackError] = useState(null);

  // Interactive state for concept/practice questions
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceFeedback, setPracticeFeedback] = useState({});

  useEffect(() => {
    const fetchTestAttempt = async () => {
      try {
        const response = await axiosInstance.get(`/test-attempts/${id}`);
        setTestAttempt(response.data.testAttempt);
      } catch (err) {
        setError("Failed to load test results.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestAttempt();
  }, [id]);

  // Manual feedback trigger for result page
  const handleManualFeedback = async () => {
    if (!testAttempt?.quiz?.id) {
      setManualFeedbackError("Quiz ID not found for feedback.");
      return;
    }
    setManualFeedbackLoading(true);
    setManualFeedbackError(null);
    setManualFeedbackResult(null);
    try {
      const response = await axiosInstance.get(`/quiz/${testAttempt.quiz.id}/feedback?testAttemptId=${testAttempt.id}`);
      setManualFeedbackResult(response.data.feedback || response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setManualFeedbackError("Feedback endpoint not found. Please ensure the backend route /api/quiz/:id/feedback exists and is implemented.");
      } else {
        setManualFeedbackError(
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to generate feedback"
        );
      }
    } finally {
      setManualFeedbackLoading(false);
    }
  };

  // Helper for practice question answer
  const handlePracticeAnswer = (idx, correctIdx, qIdx) => {
    setPracticeAnswers((prev) => ({ ...prev, [qIdx]: idx }));
    setPracticeFeedback((prev) => ({
      ...prev,
      [qIdx]:
        idx === correctIdx
          ? "✅ Correct! Well done."
          : "❌ Incorrect. Review the explanation and try again.",
    }));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6]">
          <p className="text-gray-500">Loading test results...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6]">
          <p className="text-red-500">{error}</p>
        </div>
      </>
    );
  }

  if (!testAttempt) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6]">
          <p className="text-gray-500">No test attempt found.</p>
        </div>
      </>
    );
  }

  // Use manualFeedbackResult if available, else fallback to testAttempt.feedback
  const feedback = manualFeedbackResult || testAttempt.feedback || {};
  const { quiz, score, correctAnswersCount, incorrectAnswersCount, userAnswers } = testAttempt;

  // Pie chart for correct/incorrect
  const chartData = {
    labels: ["Correct", "Incorrect"],
    datasets: [
      {
        data: [correctAnswersCount, incorrectAnswersCount],
        backgroundColor: ["#a3e635", "#f87171"],
        borderColor: ["#22c55e", "#ef4444"],
        borderWidth: 2,
      },
    ],
  };

  // Bar chart for concept breakdown (if available)
  let barData = null;
  if (feedback.graphData?.conceptBreakdown) {
    barData = {
      labels: feedback.graphData.conceptBreakdown.map((c) => c.concept),
      datasets: [
        {
          label: "Correct",
          data: feedback.graphData.conceptBreakdown.map((c) => c.correct),
          backgroundColor: "#a3e635",
        },
        {
          label: "Incorrect",
          data: feedback.graphData.conceptBreakdown.map((c) => c.incorrect),
          backgroundColor: "#f87171",
        },
      ],
    };
  }

  return (
    <>
      <Navbar />
      <div className="flex flex-col min-h-screen w-full bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6] font-sans">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Header */}
          <div className="w-full max-w-6xl px-4 py-2">
            <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">
              Test Result
            </h1>
            <p className="text-center text-gray-500 text-sm">
              Here’s your personalized feedback and next steps to improve.
            </p>
          </div>
          <div className="flex w-full max-w-6xl items-start justify-center gap-6 px-4 pt-4 pb-8 flex-1">
            {/* Left: Question Breakdown */}
            <div className="flex flex-col flex-shrink-0 w-[50%] h-full rounded-2xl bg-white p-8 shadow-lg shadow-gray-200"
                 style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
              <div className="mb-4 text-center">
                <h1 className="font-serif text-3xl font-bold text-black mb-1">
                  Question <span className="underline italic font-bold decoration-pink-500">Bank</span>
                </h1>
                <p className="text-base text-neutral-500">
                  {quiz?.title || "Untitled Quiz"}
                </p>
              </div>
              <div className="space-y-3">
                {quiz.quizQuestions.map((question, index) => {
                  const userAnswer = userAnswers.find(ua => ua.quizQuestionId === question.id);
                  const isCorrect = userAnswer?.isCorrect;
                  const selectedOptionText = userAnswer ? question.options[userAnswer.selectedOptionIndex] : "N/A";
                  const correctOptionText = question.options[question.correctOption];

                  return (
                    <div
                      key={question.id}
                      className={clsx(
                        "p-4 rounded-xl border flex flex-col gap-1",
                        isCorrect
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium text-gray-800 text-sm">
                          {index + 1}. {question.question}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700">
                        Your Answer:{" "}
                        <span className={clsx("font-semibold", isCorrect ? "text-green-700" : "text-red-700")}>
                          {selectedOptionText}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="text-xs text-gray-700">
                          Correct Answer:{" "}
                          <span className="font-semibold text-green-700">
                            {correctOptionText}
                          </span>
                        </div>
                      )}
                      {feedback?.questionFeedback?.length > 0 && feedback.questionFeedback[index]?.explanation && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-gray-800 text-xs">
                          <span className="font-medium">Explanation:</span>{" "}
                          {feedback.questionFeedback[index].explanation}
                        </div>
                      )}
                      {feedback?.questionFeedback?.length > 0 && feedback.questionFeedback[index]?.concept && (
                        <div className="mt-1 text-xs text-blue-700 italic">
                          Concept: {feedback.questionFeedback[index].concept}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Feedback & Performance Card */}
            <div className="flex h-[calc(100vh-220px)] w-[60%] flex-shrink-0 flex-col rounded-2xl bg-white p-6 shadow-lg shadow-gray-200 overflow-y-auto">
              <div className="mb-4 text-center">
                <h1 className="font-serif text-3xl font-bold text-black mb-1">
                  <span className="underline italic font-bold decoration-pink-500">Feedback</span>
                </h1>
                <p className="text-base text-neutral-500">
                  AI-powered performance & recommendations
                </p>
              </div>
              {/* Score Chart */}
              <div className="mb-6 flex flex-col items-center">
                <div className="mb-4 w-40 h-40">
                  <Pie data={chartData} options={{
                    plugins: {
                      legend: { display: true, position: "bottom" },
                    },
                  }} />
                </div>
                <div className="rounded-full bg-purple-50 p-6 mb-2 flex flex-col items-center">
                  <span className="text-4xl font-bold text-purple-700">{score.toFixed(2)}%</span>
                  <span className="text-xs text-gray-500 mt-1">Score</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-700">
                    {correctAnswersCount} correct
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-red-200 bg-red-50 text-red-700">
                    {incorrectAnswersCount} incorrect
                  </span>
                </div>
              </div>
              {/* Concept Breakdown Bar Chart */}
              {barData && (
                <div className="mb-6">
                  <h2 className="text-base font-semibold mb-2 text-purple-700">Concept Mastery</h2>
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true, position: "top" },
                      },
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              )}
              {/* AI Feedback */}
              {feedback?.overallFeedback && (
                <div className="mb-6 p-3 bg-blue-50 rounded-md text-blue-800 text-sm">
                  <span className="font-medium">AI Feedback:</span>{" "}
                  {feedback.overallFeedback}
                </div>
              )}
              {/* Recommendations */}
              {feedback?.recommendations && (
                <div className="mb-6 p-4 border border-purple-200 rounded-2xl bg-purple-50 shadow">
                  <h2 className="text-lg font-semibold mb-2 text-purple-700 font-serif">Recommendations for Improvement</h2>
                  <p className="text-sm text-purple-800">{feedback.recommendations}</p>
                </div>
              )}
              {/* Interactive Concept Explanation and Practice */}
              {feedback?.interactive && (
                <div className="mb-6 p-4 border border-blue-200 rounded-2xl bg-blue-50 shadow">
                  <h2 className="text-lg font-semibold mb-2 text-blue-700 font-serif">Learn & Practice</h2>
                  <div className="mb-2 text-sm text-gray-800">
                    <span className="font-semibold">Concept Explanation:</span> {feedback.interactive.conceptExplanation}
                  </div>
                  {feedback.interactive.practiceQuestion && (
                    <div className="mt-3">
                      <div className="mb-2 text-sm font-medium text-gray-800">
                        <span className="font-semibold">Practice:</span> {feedback.interactive.practiceQuestion.question}
                      </div>
                      <div className="flex flex-col gap-2">
                        {feedback.interactive.practiceQuestion.options.map((opt, idx) => (
                          <button
                            key={idx}
                            disabled={practiceAnswers[0] !== undefined}
                            onClick={() =>
                              handlePracticeAnswer(
                                idx,
                                feedback.interactive.practiceQuestion.correctIndex,
                                0
                              )
                            }
                            className={clsx(
                              "px-4 py-2 rounded-lg border text-left transition-colors",
                              practiceAnswers[0] === undefined
                                ? "bg-white hover:bg-blue-100 border-blue-200"
                                : idx === feedback.interactive.practiceQuestion.correctIndex
                                ? "bg-green-100 border-green-300 text-green-800"
                                : idx === practiceAnswers[0]
                                ? "bg-red-100 border-red-300 text-red-800"
                                : "bg-white border-blue-100 text-gray-700"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {practiceFeedback[0] && (
                        <div className="mt-3 text-sm font-medium">
                          {practiceFeedback[0]}
                          {practiceAnswers[0] !== undefined && (
                            <div className="mt-1 text-xs text-gray-600">
                              <span className="font-semibold">Explanation:</span>{" "}
                              {feedback.interactive.practiceQuestion.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Manual Feedback Button */}
              <div className="flex flex-col items-center mt-4">
                <button
                  onClick={handleManualFeedback}
                  disabled={manualFeedbackLoading}
                  className={clsx(
                    "mt-2 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors text-base font-medium shadow",
                    manualFeedbackLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {manualFeedbackLoading ? "Generating Feedback..." : "Test Feedback Generation"}
                </button>
                {manualFeedbackError && (
                  <div className="mt-2 text-red-500 text-sm">{manualFeedbackError}</div>
                )}
                {manualFeedbackResult && (
                  <div className="mt-4 w-full max-w-xl rounded-xl bg-purple-50 shadow p-4">
                    <div className="font-bold text-purple-700 mb-2">Manual Feedback Preview</div>
                    <pre className="text-xs whitespace-pre-wrap text-gray-700">
                      {JSON.stringify(manualFeedbackResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex justify-center mt-auto">
                <Link
                  to={`/q/${quiz.id}`}
                  className="px-8 py-3 bg-black text-white rounded-full hover:bg-neutral-900 transition-colors text-lg font-semibold shadow"
                >
                  Retake Quiz
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}