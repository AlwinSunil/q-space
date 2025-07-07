import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosInstance";
import { Link } from "react-router-dom";
import { FileText, CheckCircle, Loader2 } from "lucide-react";
import clsx from "clsx";

export default function HistoryPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [testAttempts, setTestAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const quizzesResponse = await axiosInstance.get("/quiz/user");
        setQuizzes(quizzesResponse.data.quizzes);

        const testAttemptsResponse = await axiosInstance.get("/test-attempts/user");
        setTestAttempts(testAttemptsResponse.data.testAttempts);
      } catch (err) {
        setError("Failed to load history data.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Status badge color
  const statusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "FAILED":
        return "bg-red-100 text-red-700 border-red-200";
      case "STARTING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "GENERATING":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6] px-4 py-12 font-sans">
        <div className="mb-7 max-w-2xl px-4 text-center">
          <h1 className="mb-4 font-serif leading-14 text-black text-5xl">
            Your <span className="underline italic font-bold decoration-pink-500">Quiz History</span>
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            Instantly review all your generated quizzes and test attempts.
          </p>
        </div>
        <div className="flex w-full max-w-6xl items-start justify-center gap-6 overflow-clip overflow-x-auto px-4 pt-4 pb-16">
          {/* Quizzes Created */}
          <div className="flex h-[420px] w-80 flex-shrink-0 flex-col rounded-2xl bg-white p-5 shadow-lg shadow-gray-200">
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="w-full text-sm font-medium text-gray-800">
                  Quizzes Created
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-6 w-6 text-purple-500 mr-2" />
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : quizzes.length > 0 ? (
                <div className="space-y-2">
                  {quizzes.map((quiz) => (
                    <Link
                      to={`/q/${quiz.id}`}
                      key={quiz.id}
                      className={clsx(
                        "flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:shadow transition-shadow cursor-pointer",
                        "group"
                      )}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate text-sm">
                          {quiz.title || "Untitled Quiz"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {quiz.createdAt
                            ? new Date(quiz.createdAt).toLocaleString()
                            : ""}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border ml-2",
                          statusColor(quiz.status)
                        )}
                      >
                        {quiz.status}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-2">
                        {quiz.currentNos || 0}/{quiz.maxNos || 0}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <FileText className="h-8 w-8 text-purple-400 mb-2" />
                  <span className="text-gray-500 text-sm">No quizzes created yet.</span>
                </div>
              )}
            </div>
            <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-800">{quizzes.length}</span> quizzes
              </span>
            </div>
          </div>
          {/* Tests Taken */}
          <div className="flex h-[420px] w-80 flex-shrink-0 flex-col rounded-2xl bg-white p-5 shadow-lg shadow-gray-200">
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="w-full text-sm font-medium text-gray-800">
                  Tests Taken
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-6 w-6 text-green-500 mr-2" />
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : testAttempts.length > 0 ? (
                <div className="space-y-2">
                  {testAttempts.map((attempt) => (
                    <Link
                      to={`/test-results/${attempt.id}`}
                      key={attempt.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100 hover:shadow transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-200">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate text-sm">
                          {attempt.quiz?.title || "Untitled Quiz"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {attempt.takenAt
                            ? new Date(attempt.takenAt).toLocaleString()
                            : ""}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-green-200 bg-green-50 text-green-700 ml-2">
                        Score: {attempt.score?.toFixed(2) ?? "--"}%
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <FileText className="h-8 w-8 text-green-400 mb-2" />
                  <span className="text-gray-500 text-sm">No tests taken yet.</span>
                </div>
              )}
            </div>
            <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-800">{testAttempts.length}</span> tests
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
