import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

function HealthStatus() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <p className="mt-2 text-sm text-gray-600">
      API status: {status ?? "checking..."}
    </p>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="p-8">
            <h1 className="text-2xl font-bold">Helpdesk 2</h1>
            <HealthStatus />
          </div>
        }
      />
    </Routes>
  );
}
