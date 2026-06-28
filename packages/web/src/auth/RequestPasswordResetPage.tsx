import { useState, type FormEvent } from "react";
import { authApi, ApiError } from "../api/auth.js";

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const result = await authApi.requestPasswordReset(email);
      setMessage(
        result.sent
          ? "An email with instructions to reset your password has been sent to you."
          : "Email address does not exist"
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Request failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Reset Password</h1>
      {message && <p role="alert">{message}</p>}
      <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit">Reset Password</button>
    </form>
  );
}
