import { Routes, Route } from "react-router";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Users from "./pages/Users";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<Users />} />
        </Route>
      </Route>
    </Routes>
  );
}
