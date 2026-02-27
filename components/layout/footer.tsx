// components/layout/footer.tsx

import Link from "next/link"
import { Facebook, Mail, Phone, MapPin } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export function Footer() {
  const { contact, footerNav, social } = siteConfig

  return (
    <footer className="bg-pp-slate-800 text-white">
      <div className="container section">
        <div className="grid-auto-fit-lg" style={{ gap: "var(--space-l)" }}>
          {/* About Column */}
          <div className="stack-sm">
            <span className="font-bold text-step-2">{siteConfig.name}</span>
            <p className="text-fluid-sm text-pp-slate-300" style={{ maxWidth: "30ch" }}>
              {siteConfig.tagline}. A well-managed residential community in{" "}
              {contact.address.city}, {contact.address.state}.
            </p>
            <div className="cluster" style={{ gap: "var(--space-xs)" }}>
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pp-slate-300 hover:text-pp-gold-light transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Community Links */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Community</h3>
            <ul className="stack-xs">
              {footerNav.community.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-pp-slate-300 hover:text-pp-gold-light transition-colors text-fluid-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resident Links */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Residents</h3>
            <ul className="stack-xs">
              {footerNav.residents.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-pp-slate-300 hover:text-pp-gold-light transition-colors text-fluid-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Contact</h3>
            <ul className="stack-xs text-pp-slate-300 text-fluid-sm">
              <li className="cluster" style={{ gap: "var(--space-2xs)" }}>
                <Phone className="w-4 h-4 shrink-0" />
                <a href={`tel:${contact.phoneRaw}`} className="hover:text-pp-gold-light transition-colors">
                  {contact.phone}
                </a>
              </li>
              <li className="cluster" style={{ gap: "var(--space-2xs)" }}>
                <Mail className="w-4 h-4 shrink-0" />
                <Link href="/contact" className="hover:text-pp-gold-light transition-colors">
                  Contact Form
                </Link>
              </li>
              <li className="cluster" style={{ gap: "var(--space-2xs)", alignItems: "start" }}>
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <a
                  href="https://maps.app.goo.gl/EAoFtvzYcUetGcea9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pp-gold-light transition-colors"
                  aria-label="Open Pristine Place address in Google Maps"
                >
                  {contact.address.street}
                  <br />
                  {contact.address.city}, {contact.address.state} {contact.address.zip}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <hr className="divider" style={{ borderColor: "var(--pp-slate-700)" }} />
        <div className="stack-xs" style={{ textAlign: "center" }}>
          <p className="text-fluid-sm text-pp-slate-400">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-fluid-sm text-pp-slate-300">
            Designed by B. Franklin and Powered by:{" "}
            <a
              href="https://www.biancorp.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pp-gold-light hover:text-pp-gold-light transition-colors font-semibold"
            >
              Biancorp IT LLC
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
