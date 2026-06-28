import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, ApiError } from "../api/auth.js";

export function DeleteAccountPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await authApi.deleteAccount({ password });
      qc.setQueryData(["session"], null);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Delete Account</h1>
      <p>This action is permanent.</p>
      {error && <p role="alert">{error}</p>}
      <input type="password" placeholder="confirm password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Delete My Account</button>
    </form>
  );
}
