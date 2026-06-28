import { Link } from "react-router-dom";
import { useSession, useLogout } from "./useSession.js";

export function AccountPage() {
  const { data: user, isLoading } = useSession();
  const logout = useLogout();

  if (isLoading) return <p>Loading...</p>;
  if (!user) return <p>You are not logged in. <Link to="/login">Login</Link></p>;

  return (
    <div>
      <h1>Account</h1>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
      <ul>
        <li><Link to="/account/change-password">Change password</Link></li>
        <li><Link to="/account/change-email">Change email</Link></li>
        <li><Link to="/account/delete">Delete account</Link></li>
      </ul>
      <button onClick={() => logout.mutate()}>Logout</button>
    </div>
  );
}
