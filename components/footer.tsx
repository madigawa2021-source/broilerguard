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
              <a href="tel:+2348012345678" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <Phone className="w-4 h-4" />
                +234 801 234 5678
              </a>
              <a href="mailto:hello@broilerguard.ng" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <Mail className="w-4 h-4" />
                hello@broilerguard.ng
              </a>
              <div className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>14 Adeola Odeku Street, Victoria Island, Lagos</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {["Features", "Pricing", "Case Studies", "API Docs", "Integrations"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {["About Us", "Careers", "Blog", "Press", "Partners"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-3">
              {["Help Center", "Contact Us", "Installation Guide", "Training Videos", "Community Forum"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
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
