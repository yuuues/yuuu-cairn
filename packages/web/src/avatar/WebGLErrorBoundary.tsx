import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Un <Canvas> de WebGL puede fallar al crear el contexto (aceleración por
 * hardware desactivada, sesión RDP que cae a Direct3D9, driver bloqueado…).
 * Three.js lanza durante el layout effect, y sin un error boundary eso tumba
 * todo el árbol de React (pantalla blanca). Aquí lo atrapamos y mostramos un
 * fallback en su lugar. Los error boundaries deben ser componentes de clase.
 */
export class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Deja rastro en consola para depurar, pero no propagues el crash.
    console.warn("WebGL no disponible:", error.message, info.componentStack);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
