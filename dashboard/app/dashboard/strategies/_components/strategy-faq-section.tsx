import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb } from "lucide-react"
import { getFAQData } from "./strategies-data"

export function StrategyFAQSection({ activeStrategy }: { activeStrategy: string }) {
  return (
    <Card className="border">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted border">
            <Lightbulb className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {getFAQData(activeStrategy).slice(0, 2).map((faq, index) => (
            <div key={index} className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            </div>
          ))}

          {getFAQData(activeStrategy).slice(2, 4).map((faq, index) => (
            <div key={index + 2} className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
