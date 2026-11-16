import { Injectable, Logger } from '@nestjs/common';

// Sends SMS through the provider chosen in .env:
//
//   SMS_PROVIDER=pindo           SMS_API_KEY=<token>                  SMS_SENDER=SmartPOS
//   SMS_PROVIDER=africastalking  SMS_API_KEY=<key> SMS_USERNAME=<app> SMS_SENDER=SmartPOS
//     (SMS_USERNAME=sandbox + the sandbox API key: free tests in their simulator)
//   SMS_PROVIDER=log             (development: writes the SMS to the server log, sends nothing)
//
// Left empty, SMS is off and the app falls back to the till's own SMS app or
// WhatsApp. Each message costs money (about 10-20 RWF in Rwanda): keep them
// under 160 plain characters so each is billed as one SMS.
//
// The request formats below follow each provider's public examples; check them
// against your account's documentation when you sign up.

export type SmsResult = 'SENT' | 'OFF' | 'FAILED';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  private get provider() {
    return (process.env.SMS_PROVIDER ?? '').trim().toLowerCase();
  }

  get enabled() {
    return ['pindo', 'africastalking', 'log'].includes(this.provider);
  }

  // `to` in international form, digits only (250788123456).
  async send(to: string, text: string): Promise<SmsResult> {
    if (!this.enabled) return 'OFF';
    const key = process.env.SMS_API_KEY ?? '';
    const sender = process.env.SMS_SENDER || undefined;

    try {
      switch (this.provider) {
        case 'log':
          this.logger.log(`to +${to}: ${text}`);
          return 'SENT';

        // Pindo (Kigali): JSON, bearer token.
        case 'pindo': {
          const res = await fetch('https://api.pindo.io/v1/sms/', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: `+${to}`, text, sender }),
            signal: AbortSignal.timeout(15_000),
          });
          return this.result(res);
        }

        // Africa's Talking: form fields, apiKey header. The username "sandbox"
        // uses their free test system (messages show in their simulator only).
        case 'africastalking': {
          const username = (process.env.SMS_USERNAME ?? '').trim();
          const host =
            username === 'sandbox'
              ? 'https://api.sandbox.africastalking.com'
              : 'https://api.africastalking.com';
          const body = new URLSearchParams({
            username,
            to: `+${to}`,
            message: text,
            // Only once the sender name is approved; otherwise every SMS fails
            // with InvalidSenderId. Leave SMS_SENDER empty until then.
            ...(sender ? { from: sender } : {}),
          });
          const res = await fetch(`${host}/version1/messaging`, {
            method: 'POST',
            headers: {
              apiKey: key,
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) return this.result(res);
          return this.africasTalkingResult(await res.json().catch(() => null));
        }
      }
    } catch (error) {
      this.logger.warn(
        `could not send: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'FAILED';
    }
    return 'OFF';
  }

  // Africa's Talking answers 201 even when the SMS was refused; the real result
  // is per recipient: 100 Processed, 101 Sent, 102 Queued are fine. Anything
  // else (e.g. 402 InvalidSenderId, 403 InvalidPhoneNumber, 405
  // InsufficientBalance, 406 UserInBlacklist) failed.
  private africasTalkingResult(data: unknown): SmsResult {
    const recipient = (
      data as {
        SMSMessageData?: {
          Message?: string;
          Recipients?: { statusCode?: number; status?: string }[];
        };
      } | null
    )?.SMSMessageData;
    const first = recipient?.Recipients?.[0];
    if (first && [100, 101, 102].includes(Number(first.statusCode)))
      return 'SENT';
    this.logger.warn(
      `africastalking refused it: ${first?.status ?? recipient?.Message ?? 'no recipient in the answer'} (${first?.statusCode ?? '-'})`,
    );
    return 'FAILED';
  }

  private async result(res: Response): Promise<SmsResult> {
    if (res.ok) return 'SENT';
    const detail = await res.text().catch(() => '');
    this.logger.warn(
      `${this.provider} answered ${res.status}: ${detail.slice(0, 300)}`,
    );
    return 'FAILED';
  }
}
