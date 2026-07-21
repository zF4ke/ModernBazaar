import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, LifeBuoy, ShieldCheck, Receipt } from 'lucide-react'
import { LegalPage } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Contact - Modern Bazaar',
  description: 'Get in touch with Modern Bazaar for support, billing, and privacy.',
}

const TOPICS = [
  { icon: LifeBuoy, title: 'Support & feedback', body: 'Questions about a feature, a bug, or an idea for what to build next.' },
  { icon: Receipt, title: 'Billing & refunds', body: 'Subscription, invoice, or refund questions.' },
  { icon: ShieldCheck, title: 'Privacy & data', body: 'Access, correct, or delete your data, or any GDPR request.' },
]

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro={
        <p>
          {LEGAL.product} is operated by {LEGAL.operator}, based in {LEGAL.jurisdiction}. The best way to
          reach us for anything (support, billing, or privacy) is by email. We aim to reply within a few
          business days.
        </p>
      }
    >
      <div className="mb-8 flex flex-col items-start gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Email us at</div>
          <a href={`mailto:${LEGAL.email}`} className="text-lg font-semibold text-foreground hover:underline">
            {LEGAL.email}
          </a>
        </div>
      </div>

      <h2>What to email us about</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {TOPICS.map((t) => (
          <div key={t.title} className="rounded-lg border bg-card/60 p-4">
            <t.icon className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">{t.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t.body}</p>
          </div>
        ))}
      </div>

      <h2>Before you write in</h2>
      <p>
        A few common questions are already answered in our policies: see the{' '}
        <Link href="/terms">Terms of Service</Link>, <Link href="/privacy">Privacy Policy</Link>, and{' '}
        <Link href="/refund">Refund &amp; Cancellation Policy</Link>. For faster billing help, email from the
        same address tied to your account and include the date of purchase.
      </p>

      <h2>A note on what Modern Bazaar is</h2>
      <p>
        {LEGAL.product} is an independent, read-only analytics tool for Hypixel SkyBlock built on Hypixel&apos;s
        official, public Bazaar API. It does not automate or modify the game, deals only with virtual in-game
        currency, and is <strong>not affiliated with Hypixel, Mojang, or Microsoft</strong>. We can&apos;t help
        with Hypixel or Minecraft account issues; please contact those services directly.
      </p>
    </LegalPage>
  )
}
