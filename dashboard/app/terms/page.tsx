import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service - Modern Bazaar',
  description: 'The terms governing your use of Modern Bazaar.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={LEGAL.lastUpdated}
      intro={
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of{' '}
          {LEGAL.product} (the &ldquo;Service&rdquo;), operated by {LEGAL.operator} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;). By creating an account or using the Service, you agree
          to these Terms. If you do not agree, do not use the Service.
        </p>
      }
    >
      <h2>1. What Modern Bazaar is</h2>
      <p>
        {LEGAL.product} is an independent, read-only analytics tool for the video game Hypixel
        SkyBlock. It reads market data from Hypixel&apos;s official, public Bazaar API and presents
        analysis, scores, and suggested trading strategies, including the strategy the SkyBlock
        community refers to as &ldquo;Bazaar Manipulation.&rdquo; That is the established in-game name
        for a legitimate supply-and-demand trading strategy involving thinly-traded virtual items.
      </p>
      <p>The Service:</p>
      <ul>
        <li>does <strong>not</strong> automate, bot, or play the game for you;</li>
        <li>does <strong>not</strong> modify, inject into, or interact with the Minecraft or Hypixel game client;</li>
        <li>deals only with <strong>virtual in-game currency and items</strong>: there is no real-money trading of game assets; and</li>
        <li>requires you to make every trade yourself, manually, inside the game.</li>
      </ul>
      <p>
        We are <strong>not affiliated with, endorsed by, or associated with</strong> Hypixel, Mojang,
        or Microsoft. You are responsible for using the Service in accordance with the rules and terms
        of service of Hypixel and Minecraft.

      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 16 years old (or the age of digital consent in your country) and able to
        form a binding contract to use the Service. If you use the Service on behalf of another person,
        you confirm you are authorized to bind them to these Terms.
      </p>

      <h2>3. Accounts</h2>
      <p>
        Some features require an account, which is provided through our authentication provider. You are
        responsible for keeping your login credentials secure and for all activity under your account.
        Tell us at <Link href="/contact">our contact page</Link> if you suspect unauthorized use.
      </p>

      <h2>4. Subscriptions, billing, and the Merchant of Record</h2>
      <p>
        {LEGAL.product} offers a free tier and paid subscription tiers (currently &ldquo;Flipper&rdquo;
        and &ldquo;Elite&rdquo;) billed on a recurring monthly basis at the prices shown at checkout.
      </p>
      <p>
        Payments are processed by our <strong>Merchant of Record, {LEGAL.merchantOfRecord}</strong>.
        This means the Merchant of Record (not {LEGAL.operator}) is the seller of record for your
        purchase, charges your payment method, issues receipts, and calculates and remits any applicable
        sales tax, VAT, or GST. Your purchase is also subject to the Merchant of Record&apos;s terms
        presented at checkout.
      </p>
      <ul>
        <li><strong>Auto-renewal.</strong> Subscriptions renew automatically at the end of each billing period until cancelled.</li>
        <li><strong>Cancellation.</strong> You may cancel at any time from your profile or by contacting us; access continues until the end of the current paid period.</li>
        <li><strong>Price changes.</strong> We may change prices for future billing periods; we will give reasonable advance notice and the new price applies only after your current period ends.</li>
        <li><strong>Taxes.</strong> Prices may be shown exclusive or inclusive of tax depending on your location; the tax handled by the Merchant of Record is shown at checkout.</li>
      </ul>
      <p>
        Refunds and cancellations are described in our <Link href="/refund">Refund Policy</Link>.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>resell, redistribute, scrape, or republish the Service&apos;s data or output as a competing product;</li>
        <li>attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the Service;</li>
        <li>use the Service to break the rules or terms of service of any third-party game or platform; or</li>
        <li>use the Service for any unlawful purpose.</li>
      </ul>

      <h2>6. No financial or investment advice</h2>
      <p>
        Everything {LEGAL.product} shows relates to a <strong>virtual in-game economy</strong> and is
        provided for informational and entertainment purposes only. It is not financial, investment, or
        trading advice. Scores, estimates, and suggested strategies are not guarantees of any in-game
        result. You are solely responsible for your in-game decisions.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Service, its software, design, and original content are owned by {LEGAL.operator} and
        protected by applicable law. We grant you a limited, non-exclusive, non-transferable, revocable
        licence to use the Service for its intended purpose. Minecraft and Hypixel and their related
        names and marks are the property of their respective owners and are used here only descriptively.
      </p>

      <h2>8. Third-party services and data</h2>
      <p>
        The Service relies on third parties including Hypixel&apos;s public API, our payments Merchant of
        Record, authentication, and hosting providers. We are not responsible for the availability,
        accuracy, or actions of those third parties, and their terms may also apply to you.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We provide the Service on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We may
        modify, suspend, or discontinue features at any time. Game data depends on Hypixel&apos;s API and
        may be delayed, incomplete, or unavailable.
      </p>

      <h2>10. Disclaimer of warranties</h2>
      <p>
        To the maximum extent permitted by law, the Service is provided without warranties of any kind,
        whether express or implied, including fitness for a particular purpose and accuracy of data. Some
        jurisdictions do not allow certain warranty exclusions, so some of these may not apply to you.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {LEGAL.operator} will not be liable for any indirect,
        incidental, or consequential damages, or for any loss of virtual in-game currency, items, or
        progress arising from your use of the Service. Our total liability for any claim is limited to the
        amount you paid for the Service in the three months before the claim. Nothing in these Terms limits
        liability that cannot be limited under applicable law (including your mandatory consumer rights).
      </p>

      <h2>12. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate your access if you breach
        these Terms or to protect the Service. On termination, the licence in Section 7 ends; sections that
        by their nature should survive (e.g. 6, 10, 11, 13) survive.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.jurisdiction}, without regard to conflict-of-laws
        rules. If you are a consumer resident in the EU, you also benefit from the mandatory protections of
        the law of your country of residence, and may use the EU{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          Online Dispute Resolution platform
        </a>
        .
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be reflected by the &ldquo;Last
        updated&rdquo; date above and, where appropriate, communicated to you. Continued use after changes
        means you accept the updated Terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or via our{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  )
}
