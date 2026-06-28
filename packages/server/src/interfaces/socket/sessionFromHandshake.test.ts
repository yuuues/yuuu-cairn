import { describe, it, expect } from "vitest";
import { unsign } from "@fastify/cookie";
import type { SessionUser } from "@kw/shared";
import {
  resolveSessionUser,
  type SessionLookupStore,
} from "./sessionFromHandshake.js";

const SECRET = "test-secret-test-secret-test-secret";

/** Construye una cookie kw_session firmada con un sessionId conocido. */
function signedCookie(sessionId: string): string {
  // @fastify/session almacena el sessionId firmado en la cookie.
  const signed = (require("@fastify/cookie").sign as (v: string, s: string) => string)(
    sessionId,
    SECRET
  );
  return `kw_session=${encodeURIComponent(signed)}`;
}

const user: SessionUser = { id: 7, username: "u", email: "u@e.com" };

function makeStore(map: Record<string, { user?: SessionUser }>): SessionLookupStore {
  return {
    get(sid, cb) {
      cb(null, map[sid] ?? null);
    },
  };
}

describe("resolveSessionUser", () => {
  it("devuelve el SessionUser cuando la cookie es válida y la sesión existe", async () => {
    const sid = "session-abc";
    const cookieHeader = signedCookie(sid);
    const store = makeStore({ [sid]: { user } });

    const result = await resolveSessionUser(cookieHeader, SECRET, "kw_session", store);
    expect(result).toEqual(user);
  });

  it("devuelve null si no hay cookie", async () => {
    const store = makeStore({});
    expect(await resolveSessionUser(undefined, SECRET, "kw_session", store)).toBeNull();
  });

  it("devuelve null si la firma es inválida", async () => {
    const store = makeStore({ "session-abc": { user } });
    const tampered = "kw_session=nope.invalidsig";
    expect(await resolveSessionUser(tampered, SECRET, "kw_session", store)).toBeNull();
  });

  it("devuelve null si la sesión no tiene user", async () => {
    const sid = "session-xyz";
    const store = makeStore({ [sid]: {} });
    const cookieHeader = signedCookie(sid);
    expect(await resolveSessionUser(cookieHeader, SECRET, "kw_session", store)).toBeNull();
  });

  it("verifica que unsign de @fastify/cookie reconoce la firma usada", () => {
    const sid = "s1";
    const signed = (require("@fastify/cookie").sign as (v: string, s: string) => string)(sid, SECRET);
    expect(unsign(signed, SECRET).value).toBe(sid);
  });
});
