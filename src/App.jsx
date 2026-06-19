import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Employers from "./pages/Employers";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";

function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/employers" element={<Employers />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/applications" element={<Applications />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

export default App;