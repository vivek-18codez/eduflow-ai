import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import DocumentReader from "./pages/DocumentReader";
import Timetable from "./pages/Timetable";
import SmartStaffing from "./pages/SmartStaffing";
import Attendance from "./pages/Attendance";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Dashboard */}
        <Route
          path="/"
          element={<Dashboard />}
        />

        {/* AI Document Reader */}
        <Route
          path="/document-reader"
          element={<DocumentReader />}
        />

        {/* Smart Timetable */}
        <Route
          path="/timetable"
          element={<Timetable />}
        />

        {/* Smart Staffing */}
        <Route
          path="/smart-staffing"
          element={<SmartStaffing />}
        />

        {/* Attendance */}
        <Route
          path="/attendance"
          element={<Attendance />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
