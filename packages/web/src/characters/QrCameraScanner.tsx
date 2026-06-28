import { useEffect, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

/** Controles mínimos del escáner (subset de IScannerControls). */
type ScannerControls = { stop: () => void };

/**
 * Escáner de QR en vivo por cámara (getUserMedia vía @zxing/browser).
 * Llama onDecode con el texto del primer QR detectado y detiene la cámara.
 * Funciona en navegador y en el WebView de Capacitor (requiere permiso de cámara;
 * en Android nativo hay que declararlo en el manifest al añadir la plataforma).
 */
export function QrCameraScanner({
  onDecode,
  onError,
}: {
  onDecode: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: ScannerControls | undefined;
    let active = true;
    let decoded = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, ctrl) => {
        if (!active || decoded) return;
        if (result) {
          decoded = true;
          ctrl?.stop();
          onDecode(result.getText());
        }
      })
      .then((c) => {
        controls = c;
        if (!active) c.stop();
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : String(e)));

    return () => {
      active = false;
      controls?.stop();
    };
  }, [onDecode, onError]);

  return (
    <video
      ref={videoRef}
      className="w-full rounded-lg border border-border bg-black"
      muted
      playsInline
    />
  );
}
