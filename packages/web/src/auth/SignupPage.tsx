import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi, ApiError } from "../api/auth.js";
import { Card, Field, Input, Button } from "../ui/index.js";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError(t("Passwords must match"));
      return;
    }
    try {
      await authApi.signup({
        email,
        username,
        password,
        signupCode: signupCode || undefined,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <p className="text-text">A confirmation email has been sent. Please check your inbox.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">
          {t("Sign Up")}
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Field label={t("Email")} htmlFor="signup-email">
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Username")} htmlFor="signup-username">
            <Input
              id="signup-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Password")} htmlFor="signup-password">
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Confirm password")} htmlFor="signup-password2">
            <Input
              id="signup-password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Signup Code")} htmlFor="signup-code">
            <Input
              id="signup-code"
              value={signupCode}
              onChange={(e) => setSignupCode(e.target.value)}
            />
          </Field>
          <Button type="submit" className="mt-2">
            {t("Sign Up")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          <Link to="/login" className="text-accent hover:underline">
            Already have an account? {t("Login")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
