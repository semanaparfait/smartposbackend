import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

// Sends email through the SMTP server set in the environment:
//   SMTP_HOST, SMTP_PORT (465 = secure), SMTP_USER, SMTP_PASS, MAIL_FROM,
//   MAIL_ADMIN (who hears about new requests; optional).
// Without SMTP_HOST nothing is sent and `enabled` is false, so callers can fall
// back to the super admin's inbox.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;
  readonly admin: string | null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    this.transport = host
      ? createTransport({
          host,
          port,
          secure: port === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        })
      : null;
    this.from =
      process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'SmartPOS <no-reply>';
    this.admin = process.env.MAIL_ADMIN || null;
  }

  get enabled() {
    return this.transport !== null;
  }

  // True when the message went out. Failures are logged, never thrown, so a
  // broken mail server can't break the request that sends the mail.
  // `html` is the designed version; mail apps that can't show it use `text`.
  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<boolean> {
    if (!this.transport) return false;
    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Could not send "${subject}" to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  // Tells the SmartPOS team something arrived, when MAIL_ADMIN is set.
  async notifyAdmin(subject: string, text: string) {
    if (this.admin) await this.send(this.admin, subject, text);
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
