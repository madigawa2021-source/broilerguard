"use client"

import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"

export function PricingSection() {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for small-scale farmers just getting started",
      price: "45,000",
      period: "/month",
      capacity: "Up to 2,000 birds",
      features: [
        "1 Smart Camera",
        "Temperature & Humidity Sensors",
        "SMS & WhatsApp Alerts",
        "Mobile App Access",
        "Basic Analytics Dashboard",
        "Email Support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      description: "For established farms seeking to maximize efficiency",
      price: "95,000",
      period: "/month",
      capacity: "Up to 10,000 birds",
      features: [
        "3 Smart Cameras",
        "Full Environmental Sensors",
        "AI Health Detection",
        "Automated Ventilation Control",
        "Advanced Analytics & Reports",
        "Feed Optimization AI",
        "Priority Phone Support",
        "Staff Access Accounts"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large-scale operations and multi-farm management",
      price: "Custom",
      period: "",
      capacity: "Unlimited birds",
      features: [
        "Unlimited Cameras",
        "Multi-Farm Dashboard",
        "Custom Integrations",
        "Dedicated Account Manager",
        "On-Site Installation",
        "24/7 Premium Support",
        "Custom AI Training",
        "API Access"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ]

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <span className="text-sm text-primary font-medium">Pre-Launch Pricing</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Choose the Plan That Fits Your Farm
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            BroilerGuard is currently in prototype phase. These plans represent our planned pricing. Interested farmers can register for early access below.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`
                relative rounded-2xl p-8 transition-all duration-300
                ${plan.popular 
                  ? 'bg-primary/10 border-2 border-primary scale-105 shadow-xl shadow-primary/10' 
                  : 'bg-secondary/50 border border-border hover:border-primary/30'
                }
              `}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {plan.price !== "Custom" && <span className="text-muted-foreground text-lg">₦</span>}
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-primary mt-2">{plan.capacity}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full py-6 text-base ${
                  plan.popular 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                }`}
              >
                {plan.cta}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Honest prototype notice */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-2">
              <span className="text-sm text-accent font-medium">🛠️ Prototype — Built in Kano</span>
            </div>
            <p className="text-muted-foreground text-sm">
              BroilerGuard is an early-stage prototype developed for the Startup Abuja Innovation Challenge 2026.
              We are actively testing with hardware in the field. If you&apos;re a poultry farmer interested in piloting
              the system, reach out to us.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
