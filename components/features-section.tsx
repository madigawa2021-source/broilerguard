import { 
  Camera, 
  Thermometer, 
  Bell, 
  LineChart, 
  Smartphone, 
  Shield,
  Wind,
  SunMoon,
  Users
} from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Camera,
      title: "AI Vision Monitoring",
      description: "OV5640 camera captures live pen footage. Our trained MobileNetV2 model classifies flock state as cold, heat, or normal in real-time.",
      highlight: true
    },
    {
      icon: Thermometer,
      title: "Temperature & Humidity Control",
      description: "DHT11 sensor reads temp & humidity every 60 seconds. System auto-activates fan or heater to keep the pen in the optimal 28–33°C range."
    },
    {
      icon: Wind,
      title: "4-Relay Automation",
      description: "Fan, water mister, light bulb, and heater are all automatically controlled based on live sensor readings — no manual intervention needed."
    },
    {
      icon: Bell,
      title: "Instant Cloud Alerts",
      description: "Critical events are pushed to Firebase in real-time and appear on the dashboard immediately — temperature spikes, lighting changes, and intrusion."
    },
    {
      icon: Shield,
      title: "Intrusion Detection",
      description: "Vibration sensor monitors the pen for unauthorized entry or disturbance. Triggers instant buzzer alarm and Firebase alert on detection."
    },
    {
      icon: Smartphone,
      title: "Live Cloud Dashboard",
      description: "Monitor your pen from anywhere via the Next.js web dashboard. Displays live sensor values, relay states, chart history, and alert log."
    },
    {
      icon: LineChart,
      title: "Historical Data Charts",
      description: "Hourly temperature and humidity readings are logged to Firebase and visualized as time-series charts for trend analysis."
    },
    {
      icon: Users,
      title: "Servo Camera Control",
      description: "Servo motor rotates the camera for a wider field of view across the pen, ensuring full coverage without multiple cameras."
    },
    {
      icon: SunMoon,
      title: "Ambient Light Detection",
      description: "LDR light sensor detects ambient light levels. Triggers immediate alert when entering night mode and logs the lighting state to the cloud dashboard."
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
            Comprehensive tools designed specifically for Nigerian poultry farmers, built for local farming conditions and climate.
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
