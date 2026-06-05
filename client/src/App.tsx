import { Routes, Route } from "react-router";
import Login from "./pages/Login";
import Home from "./pages/Home";
import TicketsPage from "./pages/TicketsPage";
import TicketDetail from "./pages/TicketDetail";
import Users from "./pages/Users";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<Users />} />
        </Route>
      </Route>
    </Routes>
  );
}
