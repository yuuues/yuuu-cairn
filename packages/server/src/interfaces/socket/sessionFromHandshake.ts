// @fastify/cookie exports parse at runtime but its TS types use `export =` syntax;
// we import the default (the plugin function decorated with helpers) and use .parse.
import fastifyCookie, { unsign } from "@fastify/cookie";
import type { SessionUser } from "@kw/shared";

const parseCookie = (fastifyCookie as unknown as { parse: (h: string) => Record<string, string> }).parse;

/** Interfaz mínima del store de sesión de @fastify/session que necesitamos. */
export interface SessionLookupStore {
  get(
    sessionId: string,
    callback: (err: unknown, session?: { user?: SessionUser } | null) => void
  ): void;
}

/**
 * Resuelve el SessionUser asociado a la cookie de sesión del handshake.
 * Devuelve null si falta la cookie, la firma es inválida o no hay sesión/usuario.
 * Replica el flujo de @fastify/session: cookie → unsign → sessionId → store.get.
 */
export async function resolveSessionUser(
  cookieHeader: string | undefined,
  secret: string,
  cookieName: string,
  store: SessionLookupStore
): Promise<SessionUser | null> {
  if (!cookieHeader) return null;

  const parsed = parseCookie(cookieHeader);
  const raw = parsed[cookieName];
  if (!raw) return null;

  const unsigned = unsign(raw, secret);
  if (!unsigned.valid || unsigned.value === null) return null;

  const sessionId = unsigned.value;

  return new Promise<SessionUser | null>((resolve) => {
    store.get(sessionId, (err, session) => {
      if (err || !session || !session.user) {
        resolve(null);
        return;
      }
      resolve(session.user);
    });
  });
}
