// app/our-story/page.tsx

import type { Metadata } from "next"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Our Story",
  description: `Learn about the history and mission of ${siteConfig.name}, a premier residential community.`,
  openGraph: {
    title: `Our Story | ${siteConfig.name}`,
    description: `Learn about the history and mission of ${siteConfig.name}.`,
    url: `${siteConfig.url}/our-story`,
  },
  alternates: { canonical: `${siteConfig.url}/our-story` },
}

const content = {
  hero: {
    title: "Our Story",
    subtitle: "Building a community where everyone feels at home.",
  },
  sections: [
    {
      heading: "How It All Began",
      body: "Pristine Place was established with a vision of creating a residential community that goes beyond just houses and streets. From day one, the goal has been to foster genuine connections between neighbors while maintaining the highest standards of community living.",
    },
    {
      heading: "Our Mission",
      body: "We are committed to preserving property values, enhancing community aesthetics, and creating an environment where residents take pride in calling Pristine Place home. Every decision the Board makes is guided by transparency, fairness, and a deep respect for our residents.",
    },
    {
      heading: "Community Values",
      body: "Respect, communication, and stewardship are at the heart of everything we do. Whether it's maintaining common areas, organizing social events, or responding to resident concerns, we strive to be responsive, consistent, and community-minded.",
    },
  ],
}

export default function OurStoryPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="hero-section"
        style={{ '--hero-h': 'clamp(260px, 28vw + 6rem, 440px)', background: 'var(--pp-navy)' } as React.CSSProperties}
      >
        <div className="hero-overlay" style={{ background: "linear-gradient(135deg, var(--pp-navy-dark), var(--pp-navy-light))" }} />
        <div className="hero-content stack" style={{ gap: "var(--space-s)" }}>
          <h1 className="hero-title">{content.hero.title}</h1>
          <p className="hero-subtitle">{content.hero.subtitle}</p>
        </div>
      </section>

      {/* Story Sections */}
      <section className="section">
        <div className="wrapper stack-xl">
          {content.sections.map((s) => (
            <div key={s.heading} className="flow">
              <h2>{s.heading}</h2>
              <p className="text-fluid-lg text-pp-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
