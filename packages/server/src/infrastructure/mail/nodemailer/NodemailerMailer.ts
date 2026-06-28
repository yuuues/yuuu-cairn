import nodemailer, { type Transporter } from "nodemailer";
import type { Mailer, EmailMessage } from "@kw/core";

export interface MailerConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}

export class NodemailerMailer implements Mailer {
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: MailerConfig) {
    this.from = config.user ?? "no-reply@kettlewright.local";
    if (config.host) {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port ?? 587,
        secure: config.secure ?? false,
        auth:
          config.user && config.pass
            ? { user: config.user, pass: config.pass }
            : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      // Modo desarrollo: sin SMTP configurado, log a consola.
      console.log("[mail:dev]", {
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
