import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
import { Container, Button } from "../ui/index.js";

export function HomePage() {
  const { data: user } = useSession();
  const { t } = useTranslation();

  return (
    <Container className="max-w-3xl text-center">
      <h1 className="mb-4 font-serif text-5xl text-text">Kettlewright</h1>
      <p className="mb-8 text-muted">{t("Manage your Cairn characters and parties")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {user ? (
          <>
            <Link to="/characters">
              <Button>{t("Characters")}</Button>
            </Link>
            <Link to="/parties">
              <Button variant="secondary">{t("Parties")}</Button>
            </Link>
            <Link to="/account">
              <Button variant="ghost">{t("Account")}</Button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button>{t("Login")}</Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary">{t("Sign Up")}</Button>
            </Link>
          </>
        )}
      </div>
    </Container>
  );
}
