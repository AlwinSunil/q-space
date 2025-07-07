import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Footer from "./components/footer";
import "./App.css";

import Landing from "./pages/landing";
import New from "./pages/new";
import QuizPage from "./pages/quiz-page";
import ProfileSettings from "./pages/ProfileSettings";
import HistoryPage from "./pages/HistoryPage";
import TestResultPage from "./pages/TestResultPage";

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/" />;
};

const LoginRedirect = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/new" /> : <Landing />;
};

const routes = [
  { path: "/", element: <LoginRedirect /> },
  { path: "/new", element: <ProtectedRoute element={<New />} /> },
  { path: "/q/:id", element: <ProtectedRoute element={<QuizPage />} /> },
  { path: "/settings", element: <ProtectedRoute element={<ProfileSettings />} /> },
  { path: "/history", element: <ProtectedRoute element={<HistoryPage />} /> },
  { path: "/test-results/:id", element: <ProtectedRoute element={<TestResultPage />} /> },
];

function App() {
  return (
    <>
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
      </Routes>
      <Footer />
    </>
  );
}

export default App;
