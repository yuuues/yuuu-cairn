import type { Captcha } from "../ports/driven/Captcha.js";

export class FakeCaptcha implements Captcha {
  constructor(private readonly result: boolean = true) {}
  async verify(): Promise<boolean> {
    return this.result;
  }
}
