import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { SubcontractorsList } from "./pages/SubcontractorsList";
import { SubcontractorProfile } from "./pages/SubcontractorProfile";
import { ChangesAndAlerts } from "./pages/ChangesAndAlerts";
import { Tasks } from "./pages/Tasks";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-white">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subcontractors" element={<SubcontractorsList />} />
          <Route path="/subcontractors/:id" element={<SubcontractorProfile />} />
          <Route path="/changes" element={<ChangesAndAlerts />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
