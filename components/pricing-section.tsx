"use client"

import { Cpu, Wallet, TrendingUp } from "lucide-react"

export function PricingSection() {
  const pillars = [
    {
      title: "How It Works",
      icon: <Cpu className="w-8 h-8 text-primary" />,
      description: "Our IoT ESP32-S3 hardware monitors temperature and humidity while capturing multi-angle visuals of the pen. Google's Gemini AI analyzes the flock in real-time, detecting early signs of diseases like Newcastle or Coccidiosis from dropping colors and bird behavior. Automated relays manage climate control instantly.",
      highlight: true
    },
    {
      title: "Value to Farmers",
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      description: "Nigerian poultry farmers lose millions to sudden disease outbreaks and heat stress. BroilerGuard provides 24/7 AI vigilance, catching illnesses days before human detection. This dramatically lowers mortality rates, optimizes feed conversion, and directly increases the farmer's profit margins per cycle.",
      highlight: false
    },
    {
      title: "Revenue Model",
      icon: <Wallet className="w-8 h-8 text-primary" />,
      description: "We utilize a Hardware-as-a-Service (HaaS) strategy. The core IoT hub is subsidized to eliminate high setup barriers. Farmers then pay an affordable recurring SaaS subscription for AI monitoring, continuous SMS alerts, and complete dashboard access. This ensures scalable, predictable recurring revenue for investors.",
      highlight: false
    }
  ]

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <span className="text-sm text-primary font-medium">The BroilerGuard Advantage</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Smarter Poultry Farming. Proven Results.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive solution designed from the ground up to protect flocks, empower farmers, and deliver sustainable ROI.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar) => (
            <div 
              key={pillar.title}
              className={`
                relative rounded-2xl p-8 transition-all duration-300
                ${pillar.highlight 
                  ? 'bg-primary/5 border border-primary/30 shadow-lg' 
                  : 'bg-secondary/30 border border-border hover:border-primary/30'
                }
              `}
            >
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-xl bg-background border border-border shadow-sm">
                {pillar.icon}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">{pillar.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Honest prototype notice */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-2">
              <span className="text-sm text-accent font-medium">🛠️ BroilerGuard — Built for Nigerian Poultry Farmers</span>
            </div>
            <p className="text-muted-foreground text-sm">
              BroilerGuard is an early-stage prototype developed for the Startup Kano Innovation Challenge 2026.
              We are actively testing with hardware in the field. If you&apos;re a poultry farmer interested in piloting
              the system, reach out to us.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
