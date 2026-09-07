import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { ModalProvider } from "./lib/modals";
import BottomNav from "./components/BottomNav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import People from "./pages/People";
import Reports from "./pages/Reports";
import Review from "./pages/Review";

export default function App() {
  const { user } = useAuth();

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">در حال بارگذاری…</div>;
  }

  if (user === null) {
    return <Login />;
  }

  return (
    <ModalProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/people" element={<People />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/review" element={<Review />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </ModalProvider>
  );
}
