import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, ApiError } from "../api/auth.js";

export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Passwords must match");
      return;
    }
    try {
      await authApi.changePassword({ oldPassword, password });
      navigate("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Change failed");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Change Password</h1>
      {error && <p role="alert">{error}</p>}
      <input type="password" placeholder="current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
      <input type="password" placeholder="new password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input type="password" placeholder="confirm new password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
      <button type="submit">Change</button>
    </form>
  );
}
