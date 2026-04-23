import { 
  Camera, 
  Thermometer, 
  Bell, 
  LineChart, 
  Smartphone, 
  Shield,
  Wind,
  Scale,
  Users
} from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Camera,
      title: "AI Vision Monitoring",
      description: "Smart cameras analyze bird behavior, movement patterns, and detect early signs of illness or distress.",
      highlight: true
    },
    {
      icon: Thermometer,
      title: "Environmental Control",
      description: "Monitor and automatically adjust temperature, humidity, and ammonia levels for optimal conditions."
    },
    {
      icon: Bell,
      title: "Instant Alerts",
      description: "Get real-time notifications via SMS, WhatsApp, or app when any parameter goes out of range."
    },
    {
      icon: LineChart,
      title: "Growth Analytics",
      description: "Track weight gain, feed conversion ratios, and predict market-ready dates with precision."
    },
    {
      icon: Wind,
      title: "Ventilation Control",
      description: "Automated fan control ensures proper airflow and reduces respiratory issues in your flock."
    },
    {
      icon: Scale,
      title: "Feed Optimization",
      description: "AI-driven feeding schedules reduce waste by 30% while maintaining optimal growth rates."
    },
    {
      icon: Smartphone,
      title: "Mobile Dashboard",
      description: "Monitor your farm from anywhere with our intuitive mobile app, available offline too."
    },
    {
      icon: Users,
      title: "Multi-Farm Support",
      description: "Manage multiple farm locations from a single dashboard with role-based access for staff."
    },
    {
      icon: Shield,
      title: "Biosecurity Tracking",
      description: "Log and monitor all farm entries, ensuring compliance with biosecurity best practices."
    }
  ]

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-2 mb-6">
            <span className="text-sm text-accent font-medium">Powerful Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Everything You Need to Run a Modern Poultry Farm
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools designed specifically for Nigerian poultry farmers, with local support and Naira pricing.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className={`
                relative p-6 rounded-xl border transition-all duration-300 hover:border-primary/40 hover:bg-primary/5
                ${feature.highlight 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-card border-border'
                }
              `}
            >
              {feature.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-4
                ${feature.highlight ? 'bg-primary/20' : 'bg-secondary'}
              `}>
                <feature.icon className={`w-6 h-6 ${feature.highlight ? 'text-primary' : 'text-foreground'}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
