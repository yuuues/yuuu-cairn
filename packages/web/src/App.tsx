import { Link, Route, Routes } from "react-router-dom";
import { useSession } from "./auth/useSession.js";
import { LoginPage } from "./auth/LoginPage.js";
import { SignupPage } from "./auth/SignupPage.js";
import { ResendConfirmationPage } from "./auth/ResendConfirmationPage.js";
import { RequestPasswordResetPage } from "./auth/RequestPasswordResetPage.js";
import { ResetPasswordPage } from "./auth/ResetPasswordPage.js";
import { AccountPage } from "./auth/AccountPage.js";
import { ChangePasswordPage } from "./auth/ChangePasswordPage.js";
import { ChangeEmailPage } from "./auth/ChangeEmailPage.js";
import { DeleteAccountPage } from "./auth/DeleteAccountPage.js";

function Home() {
  const { data: user } = useSession();
  return (
    <div>
      <h1>Kettlewright</h1>
      {user ? (
        <p>
          Logged in as {user.username}. <Link to="/account">Account</Link>
        </p>
      ) : (
        <p>
          <Link to="/login">Login</Link> · <Link to="/signup">Sign Up</Link>
        </p>
      )}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
      <Route path="/reset-request" element={<RequestPasswordResetPage />} />
      <Route path="/reset" element={<ResetPasswordPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/account/change-password" element={<ChangePasswordPage />} />
      <Route path="/account/change-email" element={<ChangeEmailPage />} />
      <Route path="/account/delete" element={<DeleteAccountPage />} />
    </Routes>
  );
}
