// The SMS a customer gets about their delivery, in their language. Short and
// plain (no accents) so each is billed as one SMS (160 characters).
// Kinyarwanda and Swahili need a check by a native speaker.

type Lang = 'en' | 'rw' | 'fr' | 'sw';

const CODE: Record<Lang, { text: string; pay: string }> = {
  en: {
    text: '{shop}: Order on the way. Code {code}. Give it to the rider only when you have your order, never by phone.{pay} Help: {phone}',
    pay: ' Pay {amount} RWF at the door.',
  },
  rw: {
    text: '{shop}: Komande iri mu nzira. Kode {code}. Uyihe umumotari wamaze kwakira komande gusa, si kuri telefone.{pay} Ubufasha: {phone}',
    pay: ' Kwishyura: {amount} RWF.',
  },
  fr: {
    text: '{shop}: Commande en route. Code {code}. A donner au livreur seulement a la reception, jamais par telephone.{pay} Aide: {phone}',
    pay: ' A payer: {amount} RWF.',
  },
  sw: {
    text: '{shop}: Oda iko njiani. Namba {code}. Mpe msafirishaji ukiwa umepokea oda tu, si kwa simu.{pay} Msaada: {phone}',
    pay: ' Lipa {amount} RWF.',
  },
};

// Sent once it is marked delivered: if the customer didn't get it, they call
// at once, while the rider's time and place are on record.
const DELIVERED: Record<Lang, string> = {
  en: '{shop}: Your order was marked delivered at {time}{by}. Not received? Call {phone} now.',
  rw: '{shop}: Komande yawe yanditswe ko yagejejwe {time}{by}. Ntiwayakiriye? Hamagara {phone} ubu.',
  fr: '{shop}: Votre commande est marquee livree a {time}{by}. Pas recue? Appelez le {phone}.',
  sw: '{shop}: Oda yako imeandikwa imefika {time}{by}. Hujaipokea? Piga {phone} sasa.',
};

const BY: Record<Lang, string> = {
  en: ' by {rider}',
  rw: ' na {rider}',
  fr: ' par {rider}',
  sw: ' na {rider}',
};

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k] : m));

// Accents would make the SMS hold only 70 characters.
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const lang = (l?: string | null): Lang =>
  l === 'en' || l === 'fr' || l === 'sw' ? l : 'rw';

// Long names would push the code SMS past 160 characters (two SMS).
const shopName = (name: string) => plain(name).slice(0, 20).trim();

// The shop's number as people dial it here: "+250 787 845 162" -> "0787845162".
const shopPhone = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.startsWith('250') && digits.length === 12
    ? `0${digits.slice(3)}`
    : phone?.trim() || '';
};

export function codeSms(d: {
  language?: string | null;
  shop: string;
  code: string;
  phone?: string | null;
  toPay?: number | null;
}) {
  const t = CODE[lang(d.language)];
  const pay = d.toPay
    ? fill(t.pay, {
        amount: Math.round(d.toPay).toLocaleString('en-US'),
      })
    : '';
  return plain(
    fill(t.text, {
      shop: shopName(d.shop),
      code: d.code,
      pay,
      phone: shopPhone(d.phone),
    }),
  );
}

export function deliveredSms(d: {
  language?: string | null;
  shop: string;
  at: Date;
  rider?: string | null;
  phone?: string | null;
}) {
  const l = lang(d.language);
  const time = d.at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Kigali',
  });
  const by = d.rider ? fill(BY[l], { rider: plain(d.rider).slice(0, 20) }) : '';
  return plain(
    fill(DELIVERED[l], {
      shop: shopName(d.shop),
      time,
      by,
      phone: shopPhone(d.phone),
    }),
  );
}
