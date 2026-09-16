import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AttemptPage } from "./pages/AttemptPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PaperDetailPage } from "./pages/PaperDetailPage";
import { PaperListPage } from "./pages/PaperListPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaperListPage />} />
        <Route path="/paper/:id" element={<PaperDetailPage />} />
        <Route path="/paper/:id/attempt/:attemptId" element={<AttemptPage />} />
        <Route path="/paper/:id/attempt/:attemptId/review" element={<ReviewPage />} />
        <Route path="/paper/:id/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
