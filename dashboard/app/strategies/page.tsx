"use client"

import Link from "next/link"
import { BarChart3, Shuffle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function StrategiesLandingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Strategies</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-primary" />
              <CardTitle>Flipping</CardTitle>
            </div>
            <CardDescription>
              Descobre oportunidades de compra/venda rápidas com score e risco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link href="/strategies/flipping">Abrir Flipping</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Craft Flipping</CardTitle>
            </div>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>NPC Arbitrage</CardTitle>
            </div>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

