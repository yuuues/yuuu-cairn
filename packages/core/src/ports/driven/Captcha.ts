export interface Captcha {
  /** True si la acción es legítima (o si el captcha está deshabilitado). */
  verify(token: string | undefined, action: string, ip?: string): Promise<boolean>;
}
