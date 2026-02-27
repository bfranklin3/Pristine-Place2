// app/(portal)/resident-portal/community-resources/page.tsx

import type { Metadata } from "next"
import Link from "next/link"
import { Landmark, MessageSquare, Zap, Users, GraduationCap, ArrowRight, AlertTriangle } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `Community Resources | ${siteConfig.name} Resident Portal`,
  description: "Connect with your community and access essential services — from utilities and schools to safety programs and communication channels.",
}

/* ── Resource Cards Data ────────────────────────────────── */

const stayInTouch = [
  {
    title: "Email Notifications",
    description: "Pristine Place distributes community announcements via email notifications. Join this mailing service to stay updated on important announcements, events, and community news.",
    href: "mailto:communications@pristineplace.us?subject=Subscribe to Email Notifications",
  },
  {
    title: "Facebook Group (Residents Only)",
    description: "Our private Facebook group allows residents to share information, discuss community activities, and stay connected with neighbors. Membership is restricted to verified Pristine Place residents.",
    href: "https://www.facebook.com/pristineplace.HOA",
    external: true,
  },
  {
    title: "Monthly Newsletters",
    description: "Pristine Place publishes a monthly newsletter covering community updates, upcoming events, committee reports, and important announcements. Browse the archive of past issues.",
    href: "/documents#newsletters",
  },
]

const utilities = [
  {
    title: "Electrical Power",
    description: "Pristine Place is served by Withlacoochee River Electric Cooperative for electrical service. Contact WREC for new service setup, billing questions, or outage reporting.",
    href: "https://www.wrec.net",
    external: true,
  },
  {
    title: "Water & Sewer Service",
    description: "Hernando County provides residential water and sewage service to Pristine Place. Contact the county for new service, billing, water quality questions, or service issues.",
    href: "https://www.hernandocounty.us/living-here/utilities/",
    external: true,
  },
  {
    title: "Spectrum Internet & Cable TV",
    description: "Spectrum provides high-speed internet, Wi-Fi, and cable TV services to Pristine Place residents. Plans include reliable 900 Mbps internet tailored for streaming, gaming, and remote work.",
    href: "https://www.spectrum.com",
    external: true,
  },
]

const countyServices = [
  {
    title: "Trash, Yard Waste & Recycling Schedule",
    description: "Garbage pickup: Tuesdays and Fridays. Recycling: Tuesdays. Yard Waste: Wednesdays. Place containers at curb after 5:00 PM the evening before pickup. No pickup on major holidays.",
    href: "https://www.hernandocounty.us/living-here/garbage-recycling/",
    external: true,
  },
  {
    title: "Hernando County Care Line",
    description: "A Sheriff's Office program providing daily contact for residents living alone who would like to know someone cares. Request an application by calling (352) 797-3660.",
    href: "https://www.hernandosheriff.org/Careline.aspx",
    external: true,
  },
  {
    title: "Project Safe Return",
    description: "A Hernando County Sheriff's Office program helping caregivers protect loved ones with dementia, Alzheimer's, or autism who may wander. Includes a registry and autism awareness decals.",
    href: "https://www.hernandosheriff.org/applications/ProjectSafeReturn/",
    external: true,
  },
]

const schools = [
  {
    title: "Pine Grove Elementary School",
    description: "14411 Ken Austin Parkway, Brooksville, FL 34613. Phone: (352) 797-7090. School hours: 8:35 AM – 3:10 PM.",
    href: "https://pges.hernandoschools.org",
    external: true,
  },
  {
    title: "Powell Middle School",
    description: "4100 Barclay Avenue, Brooksville, FL 34609. Phone: (352) 797-7000. School hours: 9:10 AM – 4:10 PM.",
    href: "https://pms.hernandoschools.org",
    external: true,
  },
  {
    title: "Central High School",
    description: "14075 Ken Austin Parkway, Brooksville, FL 34613. Phone: (352) 797-7095. School hours: 7:20 AM – 2:10 PM.",
    href: "https://chs.hernandoschools.org",
    external: true,
  },
]

const emergency = [
  {
    title: "Hernando County Emergency Management",
    description: "Access emergency preparedness resources, hurricane evacuation information, and severe weather alerts for Hernando County residents.",
    href: "https://www.hernandocounty.us/public-safety/emergency-management/",
    external: true,
  },
  {
    title: "Hernando County Hurricane Preparedness",
    description: "Know your evacuation zone, find emergency shelters, and access hurricane preparation checklists. Essential information for Florida storm season.",
    href: "https://www.hernandocounty.us/public-safety/emergency-management/emergency-preparedness/",
    external: true,
  },
  {
    title: "Hernando County Evacuation Zones",
    description: "View the official Hernando County evacuation zones map (PDF) and verify your zone before hurricane season or severe weather events.",
    href: "https://npr-brightspot.s3.amazonaws.com/legacy/sites/wusf/files/201905/hernando_county_evacuation_zones.pdf",
    external: true,
  },
]

/* ── Page ─────────────────────────────────────────────────── */

export default function CommunityResourcesPage() {
  return (
    <>

      {/* ── Hero ── */}
      <section
        className="hero-section"
        style={{ background: "var(--pp-navy-dark)" }}
      >
        <div
          className="hero-overlay"
          style={{ background: "linear-gradient(135deg, #1b2e1b 0%, #3A5A40 60%, #2c4a32 100%)" }}
        />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Landmark style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-gold-light)" }} />
            <span
              className="text-fluid-sm font-semibold"
              style={{ color: "var(--pp-gold-light)", textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Resident Portal
            </span>
          </div>
          <h1 className="hero-title">Community Resources</h1>
          <p className="hero-subtitle" style={{ maxWidth: "58ch" }}>
            Connect with your community and access essential services — from utilities and schools to safety
            programs and communication channels.
          </p>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container" style={{ maxWidth: "52rem" }}>
          <p className="text-fluid-base" style={{ color: "var(--pp-slate-600)", lineHeight: 1.7 }}>
            Pristine Place is more than a neighborhood — it&rsquo;s a connected, well-served community. Below
            you&rsquo;ll find the services, utilities, schools, and communication channels that make life here easier.
          </p>
        </div>
      </section>

      {/* ── How to Stay in Touch ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <MessageSquare style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
              <h2 style={{ color: "var(--pp-navy-dark)" }}>How to Stay in Touch</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {stayInTouch.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Local Resources: Utilities ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Zap style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Utilities</h2>
              </div>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
                Essential service providers for electrical power, water, sewer, and internet/cable.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {utilities.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Local Resources: County Services ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Users style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)" }}>County Services &amp; Safety</h2>
              </div>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
                Hernando County programs supporting resident safety, wellbeing, and everyday needs.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {countyServices.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Local Resources: Schools ── */}
      <section className="section" style={{ background: "var(--pp-white)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <GraduationCap style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Schools</h2>
              </div>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
                Elementary, middle, and high schools serving the Pristine Place neighborhood.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {schools.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Emergency Preparedness ── */}
      <section className="section" style={{ background: "var(--pp-slate-50)" }}>
        <div className="container">
          <div className="stack" style={{ gap: "var(--space-l)" }}>

            <div className="stack-xs">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <AlertTriangle style={{ width: "1.25rem", height: "1.25rem", color: "var(--pp-navy)" }} />
                <h2 style={{ color: "var(--pp-navy-dark)" }}>Emergency Preparedness</h2>
              </div>
              <p className="text-fluid-base" style={{ color: "var(--pp-slate-500)" }}>
                Hurricane season preparation, evacuation zones, and emergency management resources for Florida residents.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-m)",
              }}
            >
              {emergency.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-sm" style={{ background: "var(--pp-navy-dark)" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-m)",
            }}
          >
            <div className="stack-xs">
              <h3 className="text-step-1 font-bold" style={{ color: "var(--pp-white)" }}>
                Missing a resource?
              </h3>
              <p className="text-fluid-base" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "50ch" }}>
                If you know of a valuable community resource that should be included on this page, let the Board know.
              </p>
            </div>
            <a
              href="mailto:board@pristineplace.us"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.65rem 1.4rem",
                borderRadius: "var(--radius-md)",
                background: "var(--pp-gold-light)",
                color: "var(--pp-navy-dark)",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Suggest a Resource
            </a>
          </div>
        </div>
      </section>

    </>
  )
}

/* ── Resource Card Component ────────────────────────────── */

function ResourceCard({
  title,
  description,
  href,
  external = false,
}: {
  title: string
  description: string
  href: string
  external?: boolean
}) {
  const isPlaceholder = href === "#"

  if (isPlaceholder) {
    // Non-clickable placeholder card
    return (
      <div
        className="card"
        style={{
          padding: "var(--space-l)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-s)",
          opacity: 0.6,
          cursor: "not-allowed",
        }}
      >
        <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-slate-400)" }}>
          {title}
        </h3>
        <p className="text-fluid-sm" style={{ color: "var(--pp-slate-400)", lineHeight: 1.6 }}>
          {description}
        </p>
        <span className="text-fluid-sm" style={{ color: "var(--pp-slate-300)", marginTop: "auto", fontStyle: "italic" }}>
          Coming soon
        </span>
      </div>
    )
  }

  const CardWrapper = external ? "a" : Link

  return (
    <CardWrapper
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="card card-hover"
      style={{
        textDecoration: "none",
        padding: "var(--space-l)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-s)",
      }}
    >
      <h3 className="text-step-0 font-semibold" style={{ color: "var(--pp-navy-dark)" }}>
        {title}
      </h3>
      <p className="text-fluid-sm" style={{ color: "var(--pp-slate-600)", lineHeight: 1.6 }}>
        {description}
      </p>
      <span
        className="text-fluid-sm font-semibold"
        style={{
          color: "var(--pp-navy-dark)",
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        {external ? "Visit site" : "Learn more"} <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
      </span>
    </CardWrapper>
  )
}
