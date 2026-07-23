import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy - Modern Bazaar',
  description: 'How Modern Bazaar collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LEGAL.lastUpdated}
      intro={
        <p>
          This Privacy Policy explains how {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;),
          operator of {LEGAL.product} (the &ldquo;Service&rdquo;), collects and uses your personal
          data. We are the <strong>data controller</strong> for the personal data described here. We
          are based in {LEGAL.jurisdiction} and aim to comply with the EU General Data Protection
          Regulation (GDPR).
        </p>
      }
    >
      <h2>1. Data we collect</h2>
      <h3>Account data</h3>
      <p>
        When you sign in, our authentication provider gives us an account identifier and, depending on
        your login method, your email address and display name. We use these to create and manage your
        account.
      </p>
      <h3>Subscription data</h3>
      <p>
        When you subscribe, our payments Merchant of Record ({LEGAL.merchantOfRecord}) processes your
        payment. <strong>We never receive or store your full card number.</strong> We receive limited
        records needed to grant access (your subscription plan, status, billing period, and a
        customer/subscription identifier) and the email associated with the purchase.
      </p>
      <h3>Usage and preferences</h3>
      <p>
        We store the settings and presets you save (for example, budget and filter preferences) and may
        collect basic technical and usage information (such as pages viewed and approximate, IP-derived
        region) to operate, secure, and improve the Service.
      </p>
      <h3>Referral and creator attribution</h3>
      <p>
        If you arrive through a creator referral link, we store the referral code and a random
        visitor identifier in first-party cookies. We use them to count one referred visit,
        attribute a later paid subscription, prevent duplicate attribution, and calculate creator
        commission. We do not use this identifier for advertising or cross-site tracking.
      </p>
      <h3>Optional feedback</h3>
      <p>
        If you cancel a subscription, we may store the cancellation reason you optionally provide so we
        can improve the product.
      </p>
      <p>
        We do <strong>not</strong> collect your Minecraft account credentials, and we do not connect to
        or read your private game account: the Service only reads Hypixel&apos;s public Bazaar market
        data.
      </p>

      <h2>2. Why we use your data (legal bases)</h2>
      <ul>
        <li><strong>To provide the Service</strong> (account, subscription access, saved settings): performance of a contract.</li>
        <li><strong>To process payments and prevent fraud</strong>: performance of a contract and legitimate interests.</li>
        <li><strong>To secure, maintain, and improve the Service</strong>: legitimate interests.</li>
        <li><strong>To comply with legal obligations</strong> (e.g. accounting/tax records kept by us or our Merchant of Record): legal obligation.</li>
        <li><strong>For optional communications</strong>, where applicable: consent, which you may withdraw at any time.</li>
      </ul>

      <h2>3. How we share data</h2>
      <p>We share personal data only with service providers (processors) that help us run the Service, including:</p>
      <ul>
        <li><strong>Payments / Merchant of Record</strong>: {LEGAL.merchantOfRecord}, to process subscriptions and remit taxes;</li>
        <li><strong>Authentication</strong>: our identity provider, to sign you in;</li>
        <li><strong>Hosting and infrastructure</strong>: to run and serve the application.</li>
        <li><strong>Product analytics</strong>: Vercel Web Analytics, to understand aggregate page usage without advertising profiles.</li>
      </ul>
      <p>
        We do not sell your personal data. We may disclose data if required by law or to protect our
        rights and the security of the Service.
      </p>

      <h2>4. International transfers</h2>
      <p>
        Some providers may process data outside the European Economic Area. Where they do, we rely on
        appropriate safeguards such as the European Commission&apos;s Standard Contractual Clauses or an
        adequacy decision.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep personal data for as long as your account is active and as needed to provide the Service,
        then delete or anonymize it, except where we must retain certain records (for example, billing and
        tax records) for the period required by law.
      </p>
      <p>
        Referral attribution cookies last up to 60 days. The random visitor identifier used to
        deduplicate referral visits lasts up to one year. Creator conversion and payout records are
        retained as needed for accounting, fraud prevention, and contractual records.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Under the GDPR you have the right to access, rectify, erase, restrict, and port your personal data,
        and to object to certain processing. Where processing is based on consent, you can withdraw it at
        any time. To exercise any of these rights, contact us at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <p>
        You also have the right to lodge a complaint with a supervisory authority: in {LEGAL.jurisdiction},
        the <em>Comissão Nacional de Proteção de Dados (CNPD)</em>.
      </p>

      <h2>7. Cookies and similar technologies</h2>
      <p>
        We use first-party cookies and local storage to keep you signed in, remember your theme, and
        attribute creator referrals as described above. Vercel Web Analytics provides aggregate usage
        measurement. Our authentication and payment providers may set their own necessary cookies. We do
        not use advertising cookies or sell behavioral profiles.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not directed to children under the age of digital consent in their country (16 in
        many EU states). We do not knowingly collect their data; if you believe a child has provided us
        data, contact us and we will delete it.
      </p>

      <h2>9. Security</h2>
      <p>
        We take reasonable technical and organizational measures to protect your data. No method of
        transmission or storage is completely secure, however, and we cannot guarantee absolute security.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Policy; material changes are reflected by the &ldquo;Last updated&rdquo; date
        above. Please review it periodically.
      </p>

      <h2>11. Contact</h2>
      <p>
        For any privacy question or request, contact {LEGAL.operator} at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or via our{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  )
}
