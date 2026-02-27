// components/portal/portal-footer.tsx
// Footer for the Resident Portal — includes About, Portal Quick Links,
// HOA Office Hours, Contact Info, and a bottom bar with Public Site escape link.

import Link from "next/link"
import { Facebook, Mail, Phone, MapPin, Clock, ExternalLink } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

const portalLinks = {
  community: [
    { label: "Board of Directors",  href: "/resident-portal/board" },
    { label: "Committees",          href: "/resident-portal/committees" },
    { label: "ACC",                 href: "/resident-portal/acc" },
    { label: "Events",              href: "/resident-portal/events" },
    { label: "Newsletters",         href: "/resident-portal/newsletters" },
  ],
  services: [
    { label: "Submit ACC Request",      href: "/resident-portal/acc/submit" },
    { label: "Clubhouse Rental",        href: "/resident-portal/clubhouse/rental" },
    { label: "Pay HOA Fees",            href: "/resident-portal/pay-fees" },
    { label: "Report an Issue",         href: "/resident-portal/report-issue" },
    { label: "Contact the Board",       href: "/resident-portal/contact-board" },
  ],
}

const officeHours = [
  { days: "Monday – Friday", hours: "9:00 AM – 5:00 PM" },
  { days: "Saturday",        hours: "10:00 AM – 2:00 PM" },
  { days: "Sunday",          hours: "Closed" },
]

export function PortalFooter() {
  const { contact, social } = siteConfig

  return (
    <footer style={{ background: "var(--pp-slate-900)", color: "var(--pp-white)" }}>
      <div className="container section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
            gap: "var(--space-l)",
          }}
        >

          {/* ── Column 1: About ── */}
          <div className="stack-sm">
            <span className="font-bold text-step-1">{siteConfig.name}</span>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-300)", maxWidth: "28ch" }}>
              {siteConfig.tagline}. A well-managed residential community in{" "}
              {contact.address.city}, {contact.address.state}.
            </p>
            <div
              className="text-fluid-sm"
              style={{
                color: "var(--pp-gold-light)",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "var(--radius-sm)",
                padding: "0.375rem 0.625rem",
                display: "inline-block",
                fontWeight: 500,
              }}
            >
              Resident Portal
            </div>
            <a
              href={social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pp-gold-light transition-colors"
              style={{ color: "var(--pp-slate-300)", display: "inline-flex" }}
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>

          {/* ── Column 2: Community Links ── */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Community</h3>
            <ul className="stack-xs">
              {portalLinks.community.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-fluid-sm hover:text-pp-gold-light transition-colors"
                    style={{ color: "var(--pp-slate-300)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Services Links ── */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Services</h3>
            <ul className="stack-xs">
              {portalLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-fluid-sm hover:text-pp-gold-light transition-colors"
                    style={{ color: "var(--pp-slate-300)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 4: HOA Office Hours ── */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--pp-gold-light)" }} />
              Office Hours
            </h3>
            <ul className="stack-xs">
              {officeHours.map(({ days, hours }) => (
                <li
                  key={days}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "var(--space-s)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    paddingBlock: "0.3rem",
                  }}
                >
                  <span className="text-fluid-sm" style={{ color: "var(--pp-slate-300)" }}>{days}</span>
                  <span
                    className="text-fluid-sm font-semibold"
                    style={{ color: hours === "Closed" ? "var(--pp-slate-400)" : "var(--pp-gold-light)" }}
                  >
                    {hours}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-fluid-sm" style={{ color: "var(--pp-slate-500)" }}>
              Closed on major federal holidays.
            </p>
          </div>

          {/* ── Column 5: Contact Info ── */}
          <div className="stack-xs">
            <h3 className="text-step-0 font-bold">Contact</h3>
            <ul className="stack-xs text-fluid-sm" style={{ color: "var(--pp-slate-300)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)" }}>
                <Phone className="w-4 h-4 shrink-0" />
                <a
                  href={`tel:${contact.phoneRaw}`}
                  className="hover:text-pp-gold-light transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "var(--space-2xs)" }}>
                <Mail className="w-4 h-4 shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-pp-gold-light transition-colors"
                >
                  {contact.email}
                </a>
              </li>
              <li style={{ display: "flex", alignItems: "start", gap: "var(--space-2xs)" }}>
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {contact.address.street}
                  <br />
                  {contact.address.city}, {contact.address.state} {contact.address.zip}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom Bar ── */}
        <hr style={{ borderColor: "rgba(255,255,255,0.1)", marginBlock: "var(--space-l)" }} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-s)",
          }}
        >
          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-400)" }}>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>

          <Link
            href="/"
            className="text-fluid-sm hover:text-white transition-colors flex items-center gap-1"
            style={{ color: "var(--pp-slate-500)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Back to Public Site
          </Link>

          <p className="text-fluid-sm" style={{ color: "var(--pp-slate-400)" }}>
            Designed by B. Franklin and Powered by:{" "}
            <a
              href="https://www.biancorp.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pp-gold-light transition-colors font-semibold"
              style={{ color: "var(--pp-gold-light)" }}
            >
              Biancorp IT LLC
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
