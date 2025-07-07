import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosInstance";
import clsx from "clsx";

export default function ProfileSettings() {
  const { user, fetchUserDetails } = useAuth();
  const [learningGoals, setLearningGoals] = useState(user?.learningGoals || "");
  const [academicLevel, setAcademicLevel] = useState(user?.academicLevel || "");
  const [interests, setInterests] = useState(user?.interests || "");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setLearningGoals(user?.learningGoals || "");
    setAcademicLevel(user?.academicLevel || "");
    setInterests(user?.interests || "");
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const response = await axiosInstance.post("/user/profile", {
        learningGoals,
        academicLevel,
        interests,
      });
      if (response.data.success) {
        setMessage("Profile updated successfully!");
        fetchUserDetails();
      } else {
        setError(response.data.error || "Failed to update profile.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
    }
  };

  const handleApiKeySave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const response = await axiosInstance.post("/user/api-key", {
        apiKey,
      });
      if (response.data.success) {
        setMessage("API Key saved and validated!");
        fetchUserDetails();
      } else {
        setError(response.data.error || "Failed to save API Key.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save API Key.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6] px-4 py-12 font-sans">
        <div className="mb-7 max-w-2xl px-4 text-center">
          <h1 className="mb-4 font-serif leading-14 text-black text-5xl">
            Profile <span className="underline italic font-bold decoration-pink-500">Settings</span>
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            Personalize your learning experience and manage your API key.
          </p>
        </div>
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg shadow-gray-200 p-8">
          {message && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-md mb-4 font-medium">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md mb-4 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleProfileSave} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-purple-700 font-serif">Your Learning Profile</h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="learningGoals" className="block text-sm font-semibold text-gray-700 mb-1.5">Learning Goals</label>
                <input
                  type="text"
                  id="learningGoals"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g., Master calculus, Learn Python for data science"
                />
              </div>
              <div>
                <label htmlFor="academicLevel" className="block text-sm font-semibold text-gray-700 mb-1.5">Academic Level</label>
                <input
                  type="text"
                  id="academicLevel"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  placeholder="e.g., High School, Undergraduate, Professional"
                />
              </div>
              <div>
                <label htmlFor="interests" className="block text-sm font-semibold text-gray-700 mb-1.5">Interests</label>
                <input
                  type="text"
                  id="interests"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g., AI, History, Literature, Quantum Physics"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-8 w-full py-2 px-4 rounded-full shadow-sm text-sm font-semibold text-white bg-black hover:bg-neutral-900 transition-colors"
            >
              Save Profile
            </button>
          </form>

          <div className="border-t border-gray-100 pt-8 mt-8">
            <h2 className="text-xl font-semibold mb-4 text-purple-700 font-serif">Google API Key Management</h2>
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1.5">API Key Status:</p>
              <span
                className={clsx(
                  "px-3 py-1 rounded-full text-sm font-semibold",
                  user?.userAPIKey?.isValid
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {user?.userAPIKey?.isValid ? "Valid" : "Invalid"}
              </span>
            </div>
            <form onSubmit={handleApiKeySave}>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 mb-1.5">Your Google API Key</label>
                <input
                  type="password"
                  id="apiKey"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Google API Key here"
                />
              </div>
              <button
                type="submit"
                className="mt-8 w-full py-2 px-4 rounded-full shadow-sm text-sm font-semibold text-white bg-black hover:bg-neutral-900 transition-colors"
              >
                Save API Key
              </button>
            </form>
            {/* Custom "How to create an API key" link and modal */}
            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-purple-600 underline font-medium hover:text-purple-800 transition"
                onClick={() => setShowModal(true)}
              >
                How to create a Google API Key?
              </button>
            </div>
          </div>
        </div>
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 flex flex-col items-center animate-in fade-in">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold z-10"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                style={{ lineHeight: 1 }}
              >
                &times;
              </button>
              <div className="w-full flex flex-col items-center px-8 py-8">
                <h2 className="text-2xl font-bold mb-4 text-purple-700 text-center font-serif">
                  How to create a Google API Key
                </h2>
                <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden mb-6 border border-gray-200 shadow">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/7YcW25PHnAA"
                    title="How to create Google API Key"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
                <div className="text-center">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-base text-blue-600 underline hover:text-blue-800 font-semibold"
                  >
                    Go to Google Cloud Console
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Footer */}
        <footer className="w-full text-center py-4 text-xs text-gray-400 bg-transparent mt-8">
          &copy; {new Date().getFullYear()} Re-Learn. All rights reserved.
        </footer>
      </div>
    </>
  );
}
