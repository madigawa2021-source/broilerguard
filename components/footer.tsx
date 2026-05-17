import { Shield, Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-secondary/30 border-t border-border py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">BroilerGuard</span>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              AI-powered poultry monitoring built for Nigerian farmers. Protect your flock, maximize your profits.
            </p>
            <div className="space-y-2">
              <a href="tel:+2349037358626" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <Phone className="w-4 h-4" />
                +2349037358626
              </a>
              <a href="mailto:madigawa2021@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <Mail className="w-4 h-4" />
                madigawa2021@gmail.com
              </a>
              <div className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Kano, Kano State, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Navigate</h4>
            <ul className="space-y-3">
              {[
                { label: "Features", href: "#features" },
                { label: "Advantage", href: "#advantage" },
                { label: "Live Dashboard", href: "/dashboard" },
                { label: "Contact Us", href: "#contact" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">About</h4>
            <ul className="space-y-3">
              <li>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  BroilerGuard is a prototype developed for the Startup Abuja Innovation Challenge 2026.
                  Built by a passionate team of Nigerian engineers.
                </p>
              </li>
            </ul>
          </div>

          {/* Contact anchor */}
          <div id="contact">
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              {["Help & Support", "Installation Guide", "Report an Issue"].map((item) => (
                <li key={item}>
                  <a href="mailto:madigawa2021@gmail.com" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 BroilerGuard. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <a key={item} href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
