import { useEffect, useState } from "react";

export function App() {
  const [status, setStatus] = useState("...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("sin conexión"));
  }, []);

  return <h1>Kettlewright — API: {status}</h1>;
}
