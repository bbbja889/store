/** Reference data for Link X-ray. */

/** Characters that render (nearly) identically to Latin letters, mapped to what they imitate. */
export const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ԁ: 'd', һ: 'h', ӏ: 'l', ԛ: 'q', ѕ: 's', ԝ: 'w',
  ѵ: 'v', ь: 'b', в: 'b', к: 'k', м: 'm', н: 'h', т: 't', г: 'r', п: 'n', ї: 'i', ё: 'e', ө: 'o', ү: 'y',
  // Greek
  α: 'a', ο: 'o', ρ: 'p', ν: 'v', ι: 'i', κ: 'k', τ: 't', υ: 'u', χ: 'x', ε: 'e', β: 'b', η: 'n', μ: 'u', ω: 'w',
  // Armenian
  օ: 'o', ս: 'u', հ: 'h', ո: 'n', ց: 'g', զ: 'q', ա: 'w',
  // Latin lookalikes
  ı: 'i', ɑ: 'a', ɡ: 'g', ǀ: 'l', ʟ: 'l', ℓ: 'l', ⅰ: 'i', ⅼ: 'l', ｏ: 'o', ｅ: 'e', ł: 'l', ø: 'o', đ: 'd', ħ: 'h',
};

/** ASCII tricks used in typosquats. Applied after confusables. */
export const ASCII_SKELETON: [RegExp, string][] = [
  [/rn/g, 'm'],
  [/vv/g, 'w'],
  [/cl/g, 'd'],
  [/0/g, 'o'],
  [/1/g, 'l'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/7/g, 't'],
  [/8/g, 'b'],
  [/i/g, 'l'], // "paypaI" / "paypal" — i/l/1 collapse to one shape
];

export interface Brand {
  name: string;
  /** Tokens looked for in hostnames (skeletonised). */
  tokens: string[];
  /** Registrable domains that genuinely belong to the brand. */
  domains: string[];
}

export const BRANDS: Brand[] = [
  { name: 'Google', tokens: ['google', 'gmail'], domains: ['google.com', 'google.co.in', 'gmail.com', 'youtube.com', 'goo.gl', 'g.co', 'android.com'] },
  { name: 'YouTube', tokens: ['youtube'], domains: ['youtube.com', 'youtu.be'] },
  { name: 'Apple', tokens: ['apple', 'icloud', 'itunes'], domains: ['apple.com', 'icloud.com', 'itunes.com'] },
  { name: 'Microsoft', tokens: ['microsoft', 'outlook', 'office365', 'hotmail'], domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'office365.com', 'hotmail.com', 'microsoftonline.com'] },
  { name: 'Amazon', tokens: ['amazon'], domains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'amazonaws.com', 'amzn.to'] },
  { name: 'PayPal', tokens: ['paypal'], domains: ['paypal.com', 'paypal.me'] },
  { name: 'Facebook', tokens: ['facebook'], domains: ['facebook.com', 'fb.com', 'fb.me'] },
  { name: 'Instagram', tokens: ['instagram'], domains: ['instagram.com'] },
  { name: 'WhatsApp', tokens: ['whatsapp'], domains: ['whatsapp.com', 'wa.me'] },
  { name: 'Netflix', tokens: ['netflix'], domains: ['netflix.com'] },
  { name: 'LinkedIn', tokens: ['linkedin'], domains: ['linkedin.com', 'lnkd.in'] },
  { name: 'GitHub', tokens: ['github'], domains: ['github.com', 'github.io', 'githubusercontent.com'] },
  { name: 'Telegram', tokens: ['telegram'], domains: ['telegram.org', 't.me', 'telegram.me'] },
  { name: 'Discord', tokens: ['discord'], domains: ['discord.com', 'discord.gg', 'discordapp.com'] },
  { name: 'Steam', tokens: ['steamcommunity', 'steampowered'], domains: ['steamcommunity.com', 'steampowered.com'] },
  { name: 'Spotify', tokens: ['spotify'], domains: ['spotify.com'] },
  { name: 'Binance', tokens: ['binance'], domains: ['binance.com'] },
  { name: 'Coinbase', tokens: ['coinbase'], domains: ['coinbase.com'] },
  { name: 'MetaMask', tokens: ['metamask'], domains: ['metamask.io'] },
  { name: 'Flipkart', tokens: ['flipkart'], domains: ['flipkart.com'] },
  { name: 'Paytm', tokens: ['paytm'], domains: ['paytm.com', 'paytm.in'] },
  { name: 'PhonePe', tokens: ['phonepe'], domains: ['phonepe.com'] },
  { name: 'State Bank of India', tokens: ['onlinesbi', 'sbi', 'yonosbi'], domains: ['sbi.co.in', 'onlinesbi.sbi', 'sbi', 'onlinesbi.com', 'yonosbi.sbi'] },
  { name: 'HDFC Bank', tokens: ['hdfcbank', 'hdfc'], domains: ['hdfcbank.com', 'hdfc.com', 'hdfcbank.net'] },
  { name: 'ICICI Bank', tokens: ['icicibank', 'icici'], domains: ['icicibank.com', 'icicidirect.com'] },
  { name: 'Axis Bank', tokens: ['axisbank'], domains: ['axisbank.com'] },
  { name: 'Kotak', tokens: ['kotak'], domains: ['kotak.com'] },
  { name: 'Income Tax India', tokens: ['incometax', 'incometaxindia'], domains: ['incometax.gov.in', 'incometaxindia.gov.in'] },
  { name: 'Aadhaar (UIDAI)', tokens: ['uidai', 'aadhaar', 'aadhar'], domains: ['uidai.gov.in', 'myaadhaar.uidai.gov.in'] },
  { name: 'IRCTC', tokens: ['irctc'], domains: ['irctc.co.in'] },
  { name: 'India Post', tokens: ['indiapost'], domains: ['indiapost.gov.in'] },
  { name: 'DHL', tokens: ['dhl'], domains: ['dhl.com'] },
  { name: 'FedEx', tokens: ['fedex'], domains: ['fedex.com'] },
  { name: 'Chase', tokens: ['chase'], domains: ['chase.com'] },
  { name: 'Wells Fargo', tokens: ['wellsfargo'], domains: ['wellsfargo.com'] },
  { name: 'Bank of America', tokens: ['bankofamerica'], domains: ['bankofamerica.com', 'bofa.com'] },
];

/** Multi-label public suffixes (subset of the Public Suffix List) + popular free hosting platforms. */
export const MULTI_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in', 'edu.in', 'res.in', 'firm.in', 'gen.in', 'ind.in', 'nic.in',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'com.br', 'net.br', 'gov.br', 'com.cn', 'net.cn', 'gov.cn', 'com.mx', 'co.za',
  'co.nz', 'com.sg', 'com.my', 'co.id', 'com.pk', 'com.bd', 'com.np', 'co.kr', 'com.tr', 'com.ar', 'com.ng', 'co.ke',
]);

export const FREE_HOSTS = new Set([
  'github.io', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'web.app', 'firebaseapp.com', 'herokuapp.com',
  'blogspot.com', 'glitch.me', 'onrender.com', 'ngrok.io', 'ngrok-free.app', 'weebly.com', 'wixsite.com',
  'webflow.io', '000webhostapp.com', 'repl.co', 'replit.app', 'surge.sh', 'framer.website', 'sites.google.com',
]);

export const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'ow.ly', 'buff.ly', 'tiny.cc',
  's.id', 'v.gd', 't.ly', 'bit.do', 'rebrand.ly', 'shorte.st', 'adf.ly', 'tinyurl.is', 'u.to',
]);

/** TLDs frequently seen in phishing campaigns, or confusable with file names. */
export const RISKY_TLDS: Record<string, string> = {
  zip: 'looks like a file name (.zip)',
  mov: 'looks like a file name (.mov)',
  top: 'cheap and frequently abused',
  xyz: 'cheap and frequently abused',
  click: 'cheap and frequently abused',
  country: 'frequently abused',
  gq: 'formerly free, heavily abused',
  tk: 'formerly free, heavily abused',
  ml: 'formerly free, heavily abused',
  cf: 'formerly free, heavily abused',
  ga: 'formerly free, heavily abused',
  work: 'frequently abused',
  support: 'frequently abused',
  rest: 'frequently abused',
  cam: 'frequently abused',
  icu: 'cheap and frequently abused',
  buzz: 'frequently abused',
  monster: 'frequently abused',
  cfd: 'cheap and frequently abused',
  sbs: 'cheap and frequently abused',
  lol: 'frequently abused',
  quest: 'frequently abused',
  bond: 'frequently abused',
  live: 'frequently abused in fake-support scams',
  shop: 'frequently abused in fake-store scams',
};

export const SCAM_WORDS = [
  'kyc', 'verify', 'verification', 'update', 'secure', 'security', 'login', 'signin', 'account', 'wallet', 'bonus',
  'reward', 'rewards', 'refund', 'gift', 'free', 'prize', 'lottery', 'otp', 'pan', 'aadhaar', 'electricity', 'bill',
  'blocked', 'suspend', 'suspended', 'claim', 'cashback', 'loan', 'unlock', 'recover', 'support', 'helpdesk', 'confirm',
];

export const DANGEROUS_EXT: Record<string, string> = {
  apk: 'an Android app',
  xapk: 'an Android app bundle',
  exe: 'a Windows program',
  msi: 'a Windows installer',
  scr: 'a Windows screensaver (an executable)',
  bat: 'a Windows script',
  cmd: 'a Windows script',
  vbs: 'a Windows script',
  jar: 'a Java program',
  dmg: 'a macOS disk image',
  iso: 'a disk image',
};
