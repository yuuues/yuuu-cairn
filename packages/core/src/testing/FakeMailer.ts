import type { Mailer, EmailMessage } from "../ports/driven/Mailer.js";

export class FakeMailer implements Mailer {
  public sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
