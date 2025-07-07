import { FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import ContinueWithGoogle from "../components/continue-with-google";

export default function Landing() {
  const [activeIndex, setActiveIndex] = useState(0);
  const questions = [
    {
      question: "What is the main purpose of Re-Learn?",
      options: [
        "To create AI-driven quizzes",
        "To provide video conferencing services",
        "To develop AI models",
        "To manage online courses",
      ],
      type: "Multiple Choice",
    },
    {
      question: "How does Re-Learn generate quizzes?",
      options: [
        "By analyzing text content",
        "By using human quiz makers",
        "By randomly selecting questions",
        "By copying existing quizzes",
      ],
      type: "Multiple Choice",
    },
    {
      question: "Why is Re-Learn beneficial for educators?",
      options: [
        "Saves time",
        "Improves question quality",
        "Ensures fairness in grading",
        "All of the above",
      ],
      type: "Multiple Choice",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % questions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [questions.length]);

  return (
    <div className="flex w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6] px-4 py-12 font-sans">
      <div>
        <p className="pt-6 pb-2 text-4xl font-semibold">
          <span className="italic">Re-</span>Learn
        </p>
      </div>

      <div className="flex w-full max-w-6xl items-center justify-center gap-6 overflow-clip overflow-x-auto px-4 pt-12 pb-16">
        <div className="flex h-64 w-72 flex-shrink-0 flex-col rounded-2xl bg-white p-5 shadow-lg shadow-gray-200">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
              <Upload className="h-3 w-3" />
            </div>
            <div className="flex-1">
              <p className="w-full text-sm font-medium text-gray-800">
                Machine Learning Quiz
              </p>
            </div>
          </div>

          <div className="mb-1">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-gray-500">
                Question Types
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                MCQ
              </span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                Short Answer
              </span>

              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                Required
              </span>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium text-gray-500">
                Uploaded Files
              </div>
            </div>

            <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
              <div className="flex items-center gap-2 p-1.5 rounded-md bg-gray-50 border border-gray-100">
                <FileText className="h-3.5 w-3.5 text-purple-600" />
                <div className="text-xs text-gray-700 truncate">
                  relearn_intro.md
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-md bg-gray-50 border border-gray-100">
                <FileText className="h-3.5 w-3.5 text-purple-600" />
                <div className="text-xs text-gray-700 truncate">
                  relearn_concepts.md
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-md bg-gray-50 border border-gray-100">
                <FileText className="h-3.5 w-3.5 text-purple-600" />
                <div className="text-xs text-gray-700 truncate">
                  relearn_advanced.md
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">3</span> files
                uploaded
              </div>
              <div className="text-xs text-gray-500">
                Est. time:{" "}
                <span className="font-semibold text-gray-800">~2 min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-64 w-48 flex-shrink-0 flex-col p-5">
          <div className="relative flex flex-1 flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 28 28"
              className="drop-shadow-glow h-20 w-20 animate-pulse filter"
              fill="none"
            >
              <path
                d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z"
                fill="url(#darkGradient)"
              />
              <defs>
                <radialGradient
                  id="darkGradient"
                  cx="0"
                  cy="0"
                  r="1"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(14 14) rotate(90) scale(20)"
                >
                  <stop offset="0.1" stopColor="#9333ea" />
                  <stop offset="0.4" stopColor="#a855f7" />
                  <stop offset="0.7" stopColor="#c084fc" />
                  <stop offset="1" stopColor="#d8b4fe" />
                </radialGradient>
              </defs>
            </svg>

            <div className="mt-4 text-center text-sm text-neutral-500">
              AI is generating quiz
            </div>
          </div>
        </div>

        <div className="flex h-64 w-72 flex-shrink-0 flex-col rounded-2xl bg-white p-5 shadow-lg shadow-gray-200 overflow-hidden">
          <div className="mb-0.5 text-gray-800">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-medium">Generated Quiz</div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border font-medium !border-purple-200 leading-3 bg-purple-100 px-2 py-0.5 text-[10px] text-purple-500">
                  AI Generated
                </span>
              </div>
            </div>
            <div className="text-lg leading-6 font-semibold text-purple-600">
              Re-Learn Introduction Quiz
            </div>
            <div className="text-[10px] font-medium text-gray-500">
              3 questions generated
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {questions.map((q, idx) => {
              const position =
                idx === activeIndex ? 0 : idx < activeIndex ? -100 : 100;

              return (
                <div
                  key={idx}
                  className="absolute inset-0 transition-all duration-500 ease-in-out"
                  style={{
                    opacity: idx === activeIndex ? 1 : 0,
                    transform: `translateY(${position}%)`,
                    pointerEvents: idx === activeIndex ? "auto" : "none",
                  }}
                >
                  <div className="py-2">
                    <div className="mb-1 text-xs font-semibold text-gray-500">
                      Question {idx + 1} • {q.type}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {q.question}
                    </div>
                    {q.options && (
                      <div className="mt-1 space-y-1">
                        {q.options.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full border border-purple-300"></div>
                            <div className="text-xs text-gray-600">
                              {option}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-7 max-w-2xl px-4 text-center">
        <h1 className="mb-4 font-serif leading-14 text-black   text-5xl">
          Let AI{" "}
          <span className="underline italic font-bold decoration-pink-500">
            Supercharge
          </span>{" "}
          your learning experience
        </h1>
        <p className="mb-8 text-base text-neutral-500">
          Transform content into high-quality quizzes for students, educators,
          and institutions-instantly and effortlessly.
        </p>

        <div className="flex flex-col items-center">
          <ContinueWithGoogle />
          <span className="text-sm text-[#666]">
            takes ~2 minutes to create quiz
          </span>
        </div>
      </div>
    </div>
  );
}
