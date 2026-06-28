import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.js";
import { HomePage } from "./pages/HomePage.js";
import { LoginPage } from "./auth/LoginPage.js";
import { SignupPage } from "./auth/SignupPage.js";
import { ResendConfirmationPage } from "./auth/ResendConfirmationPage.js";
import { RequestPasswordResetPage } from "./auth/RequestPasswordResetPage.js";
import { ResetPasswordPage } from "./auth/ResetPasswordPage.js";
import { AccountPage } from "./auth/AccountPage.js";
import { ChangePasswordPage } from "./auth/ChangePasswordPage.js";
import { ChangeEmailPage } from "./auth/ChangeEmailPage.js";
import { DeleteAccountPage } from "./auth/DeleteAccountPage.js";
import { CharacterListPage } from "./characters/CharacterListPage.js";
import { CharacterViewPage } from "./characters/CharacterViewPage.js";
import { CharacterEditPage } from "./characters/CharacterEditPage.js";
import { CharacterCreatePage } from "./characters/create/CharacterCreatePage.js";
import { ImportCharacterPage } from "./characters/ImportCharacterPage.js";
import { PrintCharacterPage } from "./characters/PrintCharacterPage.js";
import { InventoryEditorPage } from "./inventory/InventoryEditorPage.js";
import { PartyListPage } from "./parties/PartyListPage.js";
import { PartyCreatePage } from "./parties/PartyCreatePage.js";
import { PartyViewPage } from "./parties/PartyViewPage.js";
import { PartyEditPage } from "./parties/PartyEditPage.js";
import { JoinPartyPage } from "./parties/JoinPartyPage.js";
import { ToolsPage } from "./generators/ToolsPage.js";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
        <Route path="/reset-request" element={<RequestPasswordResetPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/change-password" element={<ChangePasswordPage />} />
        <Route path="/account/change-email" element={<ChangeEmailPage />} />
        <Route path="/account/delete" element={<DeleteAccountPage />} />
        <Route path="/characters" element={<CharacterListPage />} />
        <Route path="/characters/new" element={<CharacterCreatePage />} />
        <Route path="/characters/import" element={<ImportCharacterPage />} />
        <Route path="/characters/:id" element={<CharacterViewPage />} />
        <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
        <Route
          path="/characters/:id/inventory"
          element={<InventoryEditorPage />}
        />
        <Route path="/characters/:id/print" element={<PrintCharacterPage />} />
        <Route path="/parties" element={<PartyListPage />} />
        <Route path="/parties/new" element={<PartyCreatePage />} />
        <Route path="/parties/join" element={<JoinPartyPage />} />
        <Route path="/parties/:id" element={<PartyViewPage />} />
        <Route path="/parties/:id/edit" element={<PartyEditPage />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Routes>
    </AppShell>
  );
}
