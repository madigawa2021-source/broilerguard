import { AlertTriangle, TrendingDown, Clock, CheckCircle2, Zap, BarChart3 } from "lucide-react"

export function ProblemSolutionSection() {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Late Disease Detection",
      description: "By the time you notice symptoms, diseases have already spread through your flock, causing massive losses."
    },
    {
      icon: TrendingDown,
      title: "High Mortality Rates",
      description: "Nigerian poultry farmers lose an average of 15-25% of their birds per cycle due to preventable causes."
    },
    {
      icon: Clock,
      title: "Manual Monitoring Gaps",
      description: "You can&apos;t watch your birds 24/7. Problems occur at night or when you&apos;re away from the farm."
    }
  ]

  const solutions = [
    {
      icon: CheckCircle2,
      title: "Early Warning System",
      description: "Our AI detects behavioral changes and health anomalies hours or days before visible symptoms appear."
    },
    {
      icon: Zap,
      title: "Instant Alerts",
      description: "Receive real-time SMS and WhatsApp alerts the moment something needs your attention."
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description: "Data-driven insights help you make better decisions about feeding, temperature, and flock management."
    }
  ]

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            The Problem Nigerian Farmers Face
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional poultry farming methods leave you vulnerable to sudden, devastating losses.
          </p>
        </div>

        {/* Problems grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {problems.map((problem) => (
            <div 
              key={problem.title}
              className="bg-destructive/5 border border-destructive/20 rounded-xl p-6"
            >
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{problem.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
            </div>
          ))}
        </div>

        {/* Transition arrow */}
        <div className="flex justify-center mb-20">
          <div className="w-px h-16 bg-gradient-to-b from-destructive/50 to-primary" />
        </div>

        {/* Solutions header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            How BroilerGuard Solves This
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered monitoring system gives you complete visibility and control over your farm.
          </p>
        </div>

        {/* Solutions grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((solution) => (
            <div 
              key={solution.title}
              className="bg-primary/5 border border-primary/20 rounded-xl p-6"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <solution.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{solution.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{solution.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
