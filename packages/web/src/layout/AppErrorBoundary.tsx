import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Container, Button } from "../ui/index.js";

function DefaultFallback() {
  const { t } = useTranslation();
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-serif text-2xl text-text">{t("Something went wrong")}</h1>
      <p className="max-w-md text-muted">
        {t("The app hit an unexpected error. Reloading usually fixes it.")}
      </p>
      <Button onClick={() => window.location.reload()}>{t("Reload")}</Button>
    </Container>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Cualquier componente que lance durante el render tumba todo el árbol de React
 * y deja la app en pantalla blanca. Este boundary de nivel raíz lo atrapa y
 * muestra un fallback con opción de recargar. El <WebGLErrorBoundary> del avatar
 * cubre solo el canvas 3D; este es la red de seguridad para el resto de rutas.
 * Los error boundaries deben ser componentes de clase.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de render no capturado:", error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <DefaultFallback /> : this.props.children;
  }
}
