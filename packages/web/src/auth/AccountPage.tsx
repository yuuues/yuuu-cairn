import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession, useLogout } from "./useSession.js";
import { Container, Card, Button, PageHeader, Skeleton } from "../ui/index.js";

export function AccountPage() {
  const { data: user, isLoading } = useSession();
  const logout = useLogout();
  const { t } = useTranslation();

  if (isLoading)
    return (
      <Container className="max-w-2xl">
        <PageHeader title={t("Account")} />
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </Card>
      </Container>
    );
  if (!user)
    return (
      <Container className="max-w-2xl">
        <PageHeader title={t("Account")} />
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
      <PageHeader title={t("Account")} />
      <Card className="flex flex-col gap-2">
        <p className="text-text">Username: {user.username}</p>
        <p className="text-text">
          {t("Email")}: {user.email}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <Link
              to="/account/change-password"
              className="inline-flex min-h-11 items-center text-accent hover:underline"
            >
              Change password
            </Link>
          </li>
          <li>
            <Link
              to="/account/change-email"
              className="inline-flex min-h-11 items-center text-accent hover:underline"
            >
              Change email
            </Link>
          </li>
          <li>
            <Link
              to="/account/delete"
              className="inline-flex min-h-11 items-center text-accent hover:underline"
            >
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
