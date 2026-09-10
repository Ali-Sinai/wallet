import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { useI18n } from "./lib/i18n";
import { ModalProvider } from "./lib/modals";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Activity";
import People from "./pages/People";
import Person from "./pages/Person";
import Reports from "./pages/Reports";
import Inbox from "./pages/Inbox";
import Review from "./pages/Review";
import Settings from "./pages/Settings";

export default function App() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (user === undefined) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ color: "rgba(232,234,236,.45)" }}
      >
        {t.loading}
      </div>
    );
  }

  if (user === null) return <Login />;

  return (
    <ModalProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/people" element={<People />} />
        <Route path="/people/:id" element={<Person />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/review" element={<Review />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ModalProvider>
  );
}
