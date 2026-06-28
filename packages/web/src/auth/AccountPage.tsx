import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession, useLogout } from "./useSession.js";
import { Container, Card, Button } from "../ui/index.js";

export function AccountPage() {
  const { data: user, isLoading } = useSession();
  const logout = useLogout();
  const { t } = useTranslation();

  if (isLoading)
    return (
      <Container>
        <p className="text-muted">{t("Loading")}…</p>
      </Container>
    );
  if (!user)
    return (
      <Container>
        <p className="text-muted">
          You are not logged in.{" "}
          <Link to="/login" className="text-accent hover:underline">
            {t("Login")}
          </Link>
        </p>
      </Container>
    );

  return (
    <Container className="max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl text-text">{t("Account")}</h1>
      <Card className="flex flex-col gap-2">
        <p className="text-text">Username: {user.username}</p>
        <p className="text-text">
          {t("Email")}: {user.email}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <Link to="/account/change-password" className="text-accent hover:underline">
              Change password
            </Link>
          </li>
          <li>
            <Link to="/account/change-email" className="text-accent hover:underline">
              Change email
            </Link>
          </li>
          <li>
            <Link to="/account/delete" className="text-accent hover:underline">
              Delete account
            </Link>
          </li>
        </ul>
      </Card>
      <Button variant="secondary" className="mt-6" onClick={() => logout.mutate()}>
        {t("Logout")}
      </Button>
    </Container>
  );
}
