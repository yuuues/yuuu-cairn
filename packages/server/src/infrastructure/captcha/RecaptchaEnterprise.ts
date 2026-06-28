import type { Captcha } from "@kw/core";

/** Captcha deshabilitado: siempre acepta. */
export class NoopCaptcha implements Captcha {
  async verify(): Promise<boolean> {
    return true;
  }
}

export interface RecaptchaConfig {
  projectId: string;
  siteKey: string;
  apiKey: string;
  block: boolean;
}

/** reCAPTCHA Enterprise (paridad con create_assessment de auth.py). */
export class RecaptchaEnterprise implements Captcha {
  constructor(private readonly config: RecaptchaConfig) {}

  async verify(
    token: string | undefined,
    action: string,
    ip?: string
  ): Promise<boolean> {
    // Si no bloqueamos, no hace falta penalizar: paridad con captcha_block=False.
    if (!this.config.block) {
      // Aun así, intentamos el assessment para logging; nunca bloquea.
      await this.assess(token, action, ip).catch(() => undefined);
      return true;
    }
    const result = await this.assess(token, action, ip).catch(() => null);
    if (!result) return false;
    // Riesgo: acción incorrecta o score alto (paridad: action != 'signup' o score >= 0.7).
    const risky = result.action !== action || result.score >= 0.7;
    return !risky;
  }

  private async assess(
    token: string | undefined,
    action: string,
    ip?: string
  ): Promise<{ action: string; score: number }> {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${this.config.projectId}/assessments?key=${this.config.apiKey}`;
    const body = {
      event: {
        token,
        siteKey: this.config.siteKey,
        userIpAddress: ip,
        expectedAction: action,
      },
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await resp.json()) as {
      tokenProperties?: { action?: string };
      riskAnalysis?: { score?: number };
    };
    return {
      action: data.tokenProperties?.action ?? "",
      score: data.riskAnalysis?.score ?? 1.0,
    };
  }
}
