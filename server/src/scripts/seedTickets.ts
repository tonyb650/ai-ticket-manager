import "dotenv/config";
import { TicketCategory, TicketStatus } from "@prisma/client";
import prisma from "../lib/prisma";

type Template = {
  subject: string;
  body: string;
  category: TicketCategory | null;
};

const TEMPLATES: Template[] = [
  // technical_question
  {
    subject: "Cannot log in to my account",
    body: "I keep getting an 'invalid credentials' error even after resetting my password three times. The reset email arrives but the new password is rejected on the login screen.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Mobile app crashes on launch",
    body: "Since the update to v4.2 yesterday, the iOS app crashes immediately when I open it. iPhone 15 Pro on iOS 18.2. I've already tried reinstalling.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Two-factor code never arrives",
    body: "SMS verification codes have stopped arriving on my phone. I've checked spam folders, signal is fine, and other texts arrive normally. Need to access my account urgently.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Dashboard charts not loading",
    body: "The analytics charts on the main dashboard show a spinner forever. Network tab in Chrome shows the request to /api/metrics returning 504. Started about an hour ago.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "CSV export button does nothing",
    body: "Clicking 'Export to CSV' on the reports page does not download anything. No error, no file, no network request visible. Tried Firefox and Chrome.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Webhook deliveries failing with timeout",
    body: "Our webhook endpoint started getting 408 timeouts from your delivery service around 3pm UTC. Our endpoint responds in under 200ms. We're seeing zero retries.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Slack integration keeps disconnecting",
    body: "Our Slack integration disconnects every few hours and we have to re-authorize. This started after the workspace owner enabled SSO last week.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "API returns 500 on /v1/orders endpoint",
    body: "Since 14:00 UTC we're getting intermittent 500s from GET /v1/orders. About 1 in 5 requests fail. Other endpoints are unaffected. Request ID: 7c9e-22ab.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "SSO redirect loop after SAML response",
    body: "Users in our Okta tenant are stuck in a redirect loop between the IdP and your login page. The SAML response looks correct per the trace.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "File uploads stuck at 99%",
    body: "Large file uploads (>50MB) consistently freeze at 99% and never complete. Smaller files work. We're on a 1Gbps connection.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Search results showing stale data",
    body: "The search index seems to be 6+ hours behind. New records aren't appearing in search results until much later. This is causing problems for our support team.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Password reset email never arrived",
    body: "I requested a password reset 30 minutes ago and nothing has arrived. Not in spam either. My email is correct on the account.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Browser shows blank page after login",
    body: "After entering credentials and clicking sign in, the page goes white and never loads the dashboard. Console shows 'Uncaught TypeError: cannot read properties of undefined'.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Notifications not arriving in real time",
    body: "In-app notifications are delayed by 5-10 minutes instead of arriving instantly. Email notifications seem fine. Started yesterday.",
    category: TicketCategory.technical_question,
  },
  {
    subject: "Cannot revoke API key from dashboard",
    body: "The 'Revoke' button on the API keys page is greyed out for one specific key, even though I'm the workspace owner.",
    category: TicketCategory.technical_question,
  },

  // refund_request
  {
    subject: "Charged twice for the same invoice",
    body: "I was charged $49.00 twice on May 14 for invoice INV-2024-3318. My bank statement clearly shows both charges. Please refund the duplicate.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund for accidental annual upgrade",
    body: "I clicked the wrong button and accidentally upgraded to annual billing instead of monthly. The charge went through this morning. Can you refund and revert to monthly?",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Cancel and refund — service was down",
    body: "We experienced multi-hour outages on three separate days in May, totalling over 8 hours of downtime. We'd like a partial refund for the affected billing period.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Pro-rated refund for downgrade",
    body: "We downgraded from Business to Pro on May 10 but the next invoice still charged the full Business amount. Need a pro-rated refund for the difference.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund duplicate seat purchase",
    body: "I added 5 seats this morning then realized our admin had already added them yesterday. Please refund one of the seat purchases.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund and close account",
    body: "We're switching providers. Please refund the unused portion of our annual plan and close the workspace effective immediately.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund — never received the order",
    body: "I purchased an add-on training package three weeks ago but never received any access credentials or onboarding email. Requesting a full refund.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Chargeback in lieu of refund warning",
    body: "I've sent three messages about a refund with no response. If I don't hear back within 48 hours I will initiate a chargeback through my bank.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund for unused remainder of yearly plan",
    body: "We're closing our business. Could you refund the remaining 7 months of our annual subscription?",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund failed plan upgrade",
    body: "I tried to upgrade plans but the upgrade failed mid-flow. My card was charged but the account is still on the old plan. Please refund or apply the upgrade.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Refund — wrong card charged",
    body: "The renewal charged my old expired card's replacement, which is for personal use. Please refund and re-bill to the business card on file.",
    category: TicketCategory.refund_request,
  },
  {
    subject: "Pro-rated refund for canceled seats",
    body: "Removed 3 seats last week but billing only updates next cycle. Can we get a pro-rated refund for the unused 25 days?",
    category: TicketCategory.refund_request,
  },

  // general_question
  {
    subject: "How do I add a teammate?",
    body: "I'm the workspace owner. Where do I go to invite a new team member to my workspace? I can't find the option in settings.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Does the Pro plan include API access?",
    body: "Considering upgrading from Free to Pro. Does Pro include API access, or is that only on Business and above?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Can I change my billing email?",
    body: "Our finance team has a separate email for invoices. How do I set the billing email separately from the account owner email?",
    category: TicketCategory.general_question,
  },
  {
    subject: "What is your data retention policy?",
    body: "We need this for a compliance review. How long do you retain deleted records and customer data after account closure?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Is there a non-profit discount?",
    body: "We're a registered 501(c)(3). Do you offer any discount for non-profit organizations?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How do I export all my data?",
    body: "Looking for a full data export — workspaces, users, records, attachments. Is there a self-service option?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Where is the audit log?",
    body: "Trying to find the audit log for our workspace. The docs mention it but I don't see it in the admin panel.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Does this integrate with QuickBooks?",
    body: "We use QuickBooks Online for accounting. Is there a native integration, or do we need to go through Zapier?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Invoice with VAT number please",
    body: "We need our company VAT number printed on the invoice. Where can I add it to our billing profile?",
    category: TicketCategory.general_question,
  },
  {
    subject: "What's included in the free tier?",
    body: "Looking at the pricing page but the free tier limits aren't clearly listed. Can you confirm seats, storage, and API call limits?",
    category: TicketCategory.general_question,
  },
  {
    subject: "Do you offer a student discount?",
    body: "I'm a graduate student. Are there educational pricing options available?",
    category: TicketCategory.general_question,
  },
  {
    subject: "GDPR data deletion request",
    body: "I want to exercise my right to be forgotten under GDPR. Please confirm the process for full deletion of my personal data.",
    category: TicketCategory.general_question,
  },
  {
    subject: "Custom domain on Business plan?",
    body: "Does the Business plan support custom domains for the customer-facing portal, or do we need Enterprise?",
    category: TicketCategory.general_question,
  },
  {
    subject: "What countries do you operate in?",
    body: "Looking at procurement — do you have data residency options for EU customers? Where are servers located?",
    category: TicketCategory.general_question,
  },
  {
    subject: "How do I transfer workspace ownership?",
    body: "Our current workspace owner is leaving the company. How do I transfer ownership to another admin?",
    category: TicketCategory.general_question,
  },

  // null category (vague / uncategorized)
  {
    subject: "Hello",
    body: "Hi, I have a question about my account but I'm not sure who to ask. Can someone help?",
    category: null,
  },
  {
    subject: "URGENT - please help",
    body: "Need someone to call me back ASAP. This is time sensitive.",
    category: null,
  },
  {
    subject: "Follow-up on yesterday's chat",
    body: "Just following up on the conversation I had with one of your agents yesterday afternoon. No reference number was given.",
    category: null,
  },
  {
    subject: "Feedback on the new dashboard",
    body: "Wanted to share some feedback on the redesign that rolled out last week. Mostly positive but the sidebar collapse is confusing.",
    category: null,
  },
  {
    subject: "Re: Re: account question",
    body: "Replying to your last email — yes the issue is still happening. Let me know what other info you need.",
    category: null,
  },
  {
    subject: "Confidential - security concern",
    body: "I'd like to report what may be a security issue. Could someone from your security team reach out via a secure channel?",
    category: null,
  },
  {
    subject: "Question about onboarding session",
    body: "Our team has the onboarding session booked for next Thursday. Can we add two more people from finance to the invite?",
    category: null,
  },
  {
    subject: "Renewal question",
    body: "Our renewal date is coming up next month. Can someone walk us through the options before then?",
    category: null,
  },
  {
    subject: "Account locked?",
    body: "I'm not sure if my account is locked or if there's another issue. The login page just says 'cannot proceed'.",
    category: null,
  },
  {
    subject: "Test ticket — please ignore",
    body: "Testing the inbound email pipeline from our side. Feel free to close.",
    category: null,
  },
];

const CUSTOMERS: { name: string | null; email: string }[] = [
  { name: "Alice Johnson", email: "alice.johnson@acmecorp.com" },
  { name: "Bob Patel", email: "b.patel@globex.io" },
  { name: "Carol Nguyen", email: "carol.nguyen@initech.dev" },
  { name: "David Müller", email: "david.mueller@umbrella.de" },
  { name: "Elena Rossi", email: "e.rossi@vandelay.it" },
  { name: "Farah Ahmed", email: "farah.ahmed@hooli.com" },
  { name: "Greg Thompson", email: "greg.t@piedpiper.com" },
  { name: "Hiroshi Tanaka", email: "h.tanaka@soylent.jp" },
  { name: "Isabel García", email: "isabel.g@cyberdyne.mx" },
  { name: "Jamal Williams", email: "jamal.w@stark-industries.com" },
  { name: "Katarzyna Nowak", email: "k.nowak@wonkaco.pl" },
  { name: "Liam O'Brien", email: "liam.obrien@dunder.ie" },
  { name: "Maria Silva", email: "maria.silva@waystar.br" },
  { name: "Nikhil Sharma", email: "nikhil@pearsonhr.in" },
  { name: "Olivia Chen", email: "olivia.chen@oscorp.sg" },
  { name: "Pedro Alvarez", email: "pedro.alvarez@nakatomi.es" },
  { name: "Quinn Murphy", email: "quinn.m@paperstreet.com" },
  { name: "Rashida Khan", email: "rashida@duff-beer.com" },
  { name: "Sven Lindqvist", email: "sven.l@globochem.se" },
  { name: "Tariq Hassan", email: "tariq.hassan@oceanic.ae" },
  { name: null, email: "support-account-3318@procurement.example" },
  { name: null, email: "noreply@external-billing.com" },
  { name: null, email: "help@anonproxy.net" },
  { name: null, email: "ops@bigco.example" },
  { name: "Yuki Sato", email: "yuki.sato@nintendoom.jp" },
  { name: "Zara Williams", email: "zara@krustyburger.com" },
  { name: "Andrei Volkov", email: "a.volkov@tyrell.ru" },
  { name: "Beatrice Laurent", email: "b.laurent@lacroix.fr" },
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260529);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

const now = Date.now();
const DAY_MS = 86_400_000;

const tickets = Array.from({ length: 100 }, () => {
  const template = pick(TEMPLATES);
  const customer = pick(CUSTOMERS);
  const daysAgo = Math.floor(rng() * 90);
  const offsetMs = Math.floor(rng() * DAY_MS);
  const createdAt = new Date(now - daysAgo * DAY_MS - offsetMs);
  return {
    subject: template.subject,
    body: template.body,
    fromEmail: customer.email,
    fromName: customer.name,
    category: template.category,
    status: rng() < 0.6 ? TicketStatus.open : TicketStatus.closed,
    createdAt,
  };
});

const result = await prisma.ticket.createMany({ data: tickets });
console.log(`Created ${result.count} tickets`);
await prisma.$disconnect();
