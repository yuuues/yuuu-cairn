import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, ApiError } from "../api/auth.js";

export function ChangeEmailPage() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (email !== email2) {
      setError("Email addresses must match");
      return;
    }
    try {
      await authApi.changeEmail({ password, email });
      await qc.invalidateQueries({ queryKey: ["session"] });
      navigate("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Change failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Change Email</h1>
      {error && <p role="alert">{error}</p>}
      <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="email" placeholder="new email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="email" placeholder="confirm new email" value={email2} onChange={(e) => setEmail2(e.target.value)} required />
      <button type="submit">Change</button>
    </form>
  );
}
