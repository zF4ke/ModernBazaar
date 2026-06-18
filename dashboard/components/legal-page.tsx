import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { SiteFooter } from '@/components/site-footer'

/**
 * Shared shell for the public legal pages (Terms, Privacy, Refund, Contact).
 * Keeps the four pages visually consistent and DRY: brand nav, title block, the
 * "not legal advice" notice, a styled prose container, and the shared footer.
 *
 * The prose container styles plain semantic tags (h2/h3/p/ul/a/strong) via
 * Tailwind descendant variants so each page can be written as clean markup —
 * the project doesn't ship @tailwindcss/typography.
 */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string
  lastUpdated?: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)',
      }}
    >
      <nav className="sticky top-0 z-50 border-b border-border bg-background/30 backdrop-blur supports-[backdrop-filter]:bg-background/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold">Modern Bazaar</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {lastUpdated ? (
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          ) : null}

          {intro ? <div className="mt-6 text-sm leading-relaxed text-muted-foreground">{intro}</div> : null}

          <div
            className="mt-8 text-sm leading-relaxed text-muted-foreground
              [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground
              [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:font-medium [&_h3]:text-foreground
              [&_p]:mb-3
              [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
              [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5
              [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
              [&_strong]:font-medium [&_strong]:text-foreground"
          >
            {children}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
