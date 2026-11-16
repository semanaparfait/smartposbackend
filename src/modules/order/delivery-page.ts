import QRCode from 'qrcode';
import { DeliveryStatusEnum } from './entities/order.entity';

// The customer's page (GET /d/:token): their delivery code and its QR while
// the order is on its way, then whether it was delivered. Plain HTML, no
// scripts, readable on any phone browser.

type Lang = 'en' | 'rw' | 'fr' | 'sw';

export interface CustomerPageData {
  orderId: string;
  code: string | null;
  status: DeliveryStatusEnum;
  deliveredAt: Date | null;
  language: Lang;
  customerName: string | null;
  rider: string | null;
  toPay: number | null;
  shop: { name: string; phone: string | null; logo: string | null };
}

// Kinyarwanda and Swahili need a check by a native speaker.
const TEXT: Record<
  Lang,
  {
    hello: string;
    onTheWay: string;
    yourCode: string;
    rule: string;
    showQr: string;
    pay: string;
    delivered: string;
    by: string;
    notReceived: string;
    notDelivered: string;
    call: string;
    gone: string;
  }
> = {
  en: {
    hello: 'Hello',
    onTheWay: 'Your order is on its way.',
    yourCode: 'Your delivery code',
    rule: 'Give this code to the rider only when your order is in your hands. Never give it by phone.',
    showQr: 'The rider can also scan this QR.',
    pay: 'To pay at the door',
    delivered: 'Delivered',
    by: 'by',
    notReceived: "Didn't get your order? Call the shop now.",
    notDelivered: 'This delivery could not be made. Please call the shop.',
    call: 'Call',
    gone: 'This link is no longer valid.',
  },
  rw: {
    hello: 'Muraho',
    onTheWay: 'Komande yawe iri mu nzira.',
    yourCode: 'Kode yawe',
    rule: 'Uyihe umumotari ari uko wakiriye komande yawe mu ntoki gusa. Ntuzigere uyitanga kuri telefone.',
    showQr: 'Umumotari ashobora no gusikana iyi QR.',
    pay: 'Uzishyura uyakiriye',
    delivered: 'Yagejejwe',
    by: 'na',
    notReceived: 'Ntiwakiriye komande yawe? Hamagara iduka ubu.',
    notDelivered: 'Iyi komande ntiyashoboye kugezwa. Hamagara iduka.',
    call: 'Hamagara',
    gone: 'Iyi link ntikigikora.',
  },
  fr: {
    hello: 'Bonjour',
    onTheWay: 'Votre commande est en route.',
    yourCode: 'Votre code de livraison',
    rule: 'Donnez ce code au livreur seulement quand vous avez la commande en main. Jamais par téléphone.',
    showQr: 'Le livreur peut aussi scanner ce QR.',
    pay: 'À payer à la livraison',
    delivered: 'Livrée',
    by: 'par',
    notReceived: "Vous n'avez pas reçu votre commande ? Appelez la boutique.",
    notDelivered: "Cette livraison n'a pas pu être faite. Appelez la boutique.",
    call: 'Appeler',
    gone: "Ce lien n'est plus valide.",
  },
  sw: {
    hello: 'Habari',
    onTheWay: 'Oda yako iko njiani.',
    yourCode: 'Namba yako ya uthibitisho',
    rule: 'Mpe msafirishaji namba hii tu ukiwa umepokea oda mkononi. Kamwe usiitoe kwa simu.',
    showQr: 'Msafirishaji anaweza pia kuskani QR hii.',
    pay: 'Utalipa ukipokea',
    delivered: 'Imefika',
    by: 'na',
    notReceived: 'Hujapokea oda yako? Piga simu dukani sasa.',
    notDelivered: 'Oda hii haikuweza kufikishwa. Piga simu dukani.',
    call: 'Piga',
    gone: 'Kiungo hiki hakifanyi kazi tena.',
  },
};

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

const time = (d: Date) =>
  d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Kigali',
  });

// SmartPOS colors: ink, lime, ivory.
const STYLE = `
*{box-sizing:border-box}body{margin:0;background:#F4F5EF;color:#20283B;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
main{max-width:420px;margin:0 auto;padding:24px 16px 40px}
.top{display:flex;align-items:center;gap:12px;margin-bottom:20px}.top img{width:44px;height:44px;border-radius:12px;object-fit:cover;background:#fff}
.shop{font-weight:600;font-size:17px}.muted{color:#6B7690;font-size:14px;line-height:1.45}
.card{background:#fff;border-radius:20px;padding:22px;margin-top:14px;text-align:center}
.label{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#6B7690}
.code{font-size:56px;font-weight:700;letter-spacing:.18em;margin:6px 0 14px;padding-left:.18em}
.qr{width:220px;height:220px;margin:0 auto}.qr svg{width:100%;height:100%}
.rule{background:#20283B;color:#fff;border-radius:16px;padding:14px 16px;margin-top:14px;font-size:14px;line-height:1.45;text-align:left}
.rule b{color:#D0E66B}
.pay{display:flex;justify-content:space-between;align-items:center;background:#D0E66B;border-radius:14px;padding:12px 16px;margin-top:14px;font-weight:600}
.done{font-size:22px;font-weight:600;margin:8px 0}
.call{display:block;margin-top:16px;background:#20283B;color:#D0E66B;text-decoration:none;font-weight:600;border-radius:14px;padding:14px;text-align:center}
`;

const page = (lang: Lang, title: string, body: string) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main>${body}</main></body></html>`;

export function goneHtml(): string {
  return page(
    'en',
    'SmartPOS',
    `<div class="card"><p class="muted">${TEXT.en.gone}<br>${TEXT.rw.gone}<br>${TEXT.fr.gone}</p></div>`,
  );
}

export async function customerPageHtml(d: CustomerPageData): Promise<string> {
  const t = TEXT[d.language] ?? TEXT.rw;
  const phone = d.shop.phone?.trim();
  const callLink = phone
    ? `<a class="call" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${t.call} ${esc(d.shop.name)} · ${esc(phone)}</a>`
    : '';
  const logo = d.shop.logo?.startsWith('https://')
    ? `<img src="${esc(d.shop.logo)}" alt="">`
    : '';
  const top = `<div class="top">${logo}<div><div class="shop">${esc(d.shop.name)}</div>
    <div class="muted">${t.hello}${d.customerName ? ` ${esc(d.customerName.split(' ')[0])}` : ''}</div></div></div>`;

  let body: string;
  if (d.status === DeliveryStatusEnum.DELIVERED) {
    body = `${top}<div class="card"><div class="label">${t.delivered}</div>
      <div class="done">${d.deliveredAt ? time(d.deliveredAt) : ''}${d.rider ? ` · ${t.by} ${esc(d.rider)}` : ''}</div>
      <p class="muted">${t.notReceived}</p>${callLink}</div>`;
  } else if (d.status === DeliveryStatusEnum.NOT_DELIVERED) {
    body = `${top}<div class="card"><p class="muted">${t.notDelivered}</p>${callLink}</div>`;
  } else {
    // The QR holds what the rider's app reads: SPD1:<orderId>:<code>.
    const qr = d.code
      ? await QRCode.toString(`SPD1:${d.orderId}:${d.code}`, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#20283B', light: '#FFFFFF' },
        })
      : '';
    body = `${top}<p class="muted">${t.onTheWay}</p>
      <div class="card"><div class="label">${t.yourCode}</div>
      <div class="code">${esc(d.code)}</div>
      <div class="qr">${qr}</div>
      <p class="muted">${t.showQr}</p></div>
      <div class="rule"><b>!</b> ${t.rule}</div>
      ${d.toPay ? `<div class="pay"><span>${t.pay}</span><span>${Math.round(d.toPay).toLocaleString('en-US')} RWF</span></div>` : ''}
      ${callLink}`;
  }
  return page(d.language, d.shop.name, body);
}
