import { Global, Injectable, Logger, Module } from '@nestjs/common';

// WhatsApp messages to owners through Meta's WhatsApp Cloud API. Meta only lets
// a business start a conversation with an approved template, so every message
// is one of the templates below (create them in WhatsApp Manager, category
// "Utility", language English, with exactly these names and texts):
//
//   smartpos_day_summary   {{1}} {{2}} ... {{7}}   (see daySummary below)
//   smartpos_device_request
//   smartpos_subscription
//   smartpos_money_flagged
//
// Settings: WHATSAPP_TOKEN (a permanent System User token),
// WHATSAPP_PHONE_NUMBER_ID (from WhatsApp Manager), WHATSAPP_LANG (default en).
// Without them nothing is sent.

export type WhatsAppTemplate =
  | 'smartpos_day_summary'
  | 'smartpos_device_request'
  | 'smartpos_subscription'
  | 'smartpos_money_flagged';

const GRAPH = 'https://graph.facebook.com/v21.0';

// Meta refuses template values with line breaks, tabs or long runs of spaces.
const clean = (value: string) =>
  value
    .replace(/[\r\n\t]+/g, ' · ')
    .replace(/ {4,}/g, '   ')
    .trim()
    .slice(0, 900) || '-';

// Rwandan numbers as WhatsApp wants them: 0788 123 456 -> 250788123456.
export function whatsappNumber(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('250') && digits.length === 12) return digits;
  if (digits.startsWith('07') && digits.length === 10)
    return `250${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `250${digits}`;
  return digits.length >= 10 ? digits : null;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  get enabled() {
    return !!(
      process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
  }

  // Never throws: a WhatsApp problem must not fail what triggered it.
  async send(
    phone: string | null | undefined,
    template: WhatsAppTemplate,
    values: string[],
  ) {
    const to = whatsappNumber(phone);
    if (!this.enabled || !to) return false;
    try {
      const response = await fetch(
        `${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: template,
              language: { code: process.env.WHATSAPP_LANG || 'en' },
              components: [
                {
                  type: 'body',
                  parameters: values.map((text) => ({
                    type: 'text',
                    text: clean(text),
                  })),
                },
              ],
            },
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        this.logger.warn(
          `WhatsApp ${template} to ${to} failed (${response.status}): ${detail.slice(0, 300)}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`Could not reach WhatsApp: ${String(error)}`);
      return false;
    }
  }
}

@Global()
@Module({ providers: [WhatsAppService], exports: [WhatsAppService] })
export class WhatsAppModule {}
