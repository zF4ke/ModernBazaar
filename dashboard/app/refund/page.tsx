import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy - Modern Bazaar',
  description: 'How cancellations and refunds work for Modern Bazaar subscriptions.',
}

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      lastUpdated={LEGAL.lastUpdated}
      intro={
        <p>
          This policy explains how cancellations and refunds work for paid {LEGAL.product}{' '}
          subscriptions. It supplements our <Link href="/terms">Terms of Service</Link>. Payments are
          handled by our Merchant of Record, {LEGAL.merchantOfRecord}, which is the seller of record and
          processes any refunds.
        </p>
      }
    >
      <h2>1. Subscriptions and renewals</h2>
      <p>
        Paid tiers are billed in advance on a recurring monthly basis at the price shown at checkout. Each
        subscription renews automatically until you cancel.
      </p>

      <h2>2. Cancelling</h2>
      <p>
        You can cancel at any time from your <Link href="/dashboard/profile">profile</Link>, or by emailing
        us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. When you cancel:
      </p>
      <ul>
        <li>your subscription stops renewing;</li>
        <li>you keep access to the paid features until the end of the period you have already paid for; and</li>
        <li>you are not charged again.</li>
      </ul>
      <p>
        Cancelling does not, by itself, trigger a refund of the current period: it stops future renewals.
        If you change your mind, you can resume before the period ends.
      </p>

      <h2>3. EU right of withdrawal (14-day cooling-off)</h2>
      <p>
        If you are a consumer in the EU, you normally have 14 days to withdraw from a distance purchase.
        Because {LEGAL.product} is a digital service supplied immediately, you may be asked at checkout to
        consent to immediate access and to acknowledge that you lose the 14-day withdrawal right once the
        service has been fully performed. Where the withdrawal right still applies, contact us within 14
        days of purchase for a refund of amounts not yet consumed, as required by law.
      </p>

      <h2>4. Discretionary refunds</h2>
      <p>We want you to be happy with the Service. We will generally offer a refund where:</p>
      <ul>
        <li>you were charged in error or double-charged;</li>
        <li>a technical problem on our side prevented you from using paid features and we could not fix it within a reasonable time; or</li>
        <li>you cancelled but were billed for the next period due to a system error.</li>
      </ul>
      <p>
        Refunds for change of mind after the cooling-off period, or for partially-used monthly periods, are
        at our reasonable discretion. We may decline refunds in cases of evident abuse (for example,
        repeated subscribe-and-refund cycles).
      </p>

      <h2>5. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from your account email with the date of
        purchase and the reason. We aim to respond within 5 business days. Approved refunds are issued by our
        Merchant of Record to your original payment method; the time to appear on your statement depends on
        your bank or card provider.
      </p>

      <h2>6. Your statutory rights</h2>
      <p>
        This policy does not limit any mandatory consumer rights you have under the law of{' '}
        {LEGAL.jurisdiction} or your country of residence.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about billing or refunds? Reach us at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or via our{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  )
}
