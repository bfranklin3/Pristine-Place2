// components/layout/header.tsx

"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth, useClerk } from "@clerk/nextjs"
import {
  ChevronDown,
  Phone,
  MapPin,
  Calendar,
  Bell,
  FileText,
  Mail,
  ShieldCheck,
  LogOut,
} from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export function Header() {
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [residentsOpen, setResidentsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false)
  const [mobileResidentsOpen, setMobileResidentsOpen] = useState(false)
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const isScrolled = scrollProgress > 0.1

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches)
    updateMotionPreference()
    media.addEventListener("change", updateMotionPreference)
    return () => media.removeEventListener("change", updateMotionPreference)
  }, [])

  useEffect(() => {
    const maxScroll = 120
    let ticking = false

    const update = () => {
      const y = window.scrollY
      const next = Math.max(0, Math.min(1, y / maxScroll))
      setScrollProgress(prefersReducedMotion ? (next > 0.42 ? 1 : 0) : next)
      ticking = false
    }

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [prefersReducedMotion])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  /* ── Desktop Dropdown Handlers ── */

  const handleCommunityEnter = () => {
    if (closeTimeout) { clearTimeout(closeTimeout); setCloseTimeout(null) }
    setResidentsOpen(false)
    setCommunityOpen(true)
  }
  const handleCommunityLeave = () => {
    const t = setTimeout(() => setCommunityOpen(false), 300)
    setCloseTimeout(t)
  }

  const handleResidentsEnter = () => {
    if (closeTimeout) { clearTimeout(closeTimeout); setCloseTimeout(null) }
    setCommunityOpen(false)
    setAccountOpen(false)
    setResidentsOpen(true)
  }
  const handleResidentsLeave = () => {
    const t = setTimeout(() => setResidentsOpen(false), 300)
    setCloseTimeout(t)
  }

  const handleAccountEnter = () => {
    if (closeTimeout) { clearTimeout(closeTimeout); setCloseTimeout(null) }
    setCommunityOpen(false)
    setResidentsOpen(false)
    setAccountOpen(true)
  }
  const handleAccountLeave = () => {
    const t = setTimeout(() => setAccountOpen(false), 300)
    setCloseTimeout(t)
  }

  const closeAll = () => {
    setCommunityOpen(false)
    setResidentsOpen(false)
    setAccountOpen(false)
    if (closeTimeout) { clearTimeout(closeTimeout); setCloseTimeout(null) }
  }

  const handleSignOut = async () => {
    closeAll()
    setMobileMenuOpen(false)
    await signOut({ redirectUrl: "/" })
  }

  /* ── Keyboard Accessibility ── */

  const handleDropdownKeyDown = (
    e: React.KeyboardEvent,
    isOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    otherClose: React.Dispatch<React.SetStateAction<boolean>>,
    menuLabel: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      otherClose(false)
      setOpen(!isOpen)
    } else if (e.key === "Escape") {
      setOpen(false)
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault()
      const first = document.querySelector(
        `[role="menu"][aria-label="${menuLabel}"] a`
      ) as HTMLElement
      first?.focus()
    }
  }

  const handleMenuKeyDown = (
    e: React.KeyboardEvent,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (e.key === "Escape") setOpen(false)
  }

  /* ── Active Route Helper ── */
  const isActive = (href: string) => pathname === href
  const isEventsRoute = pathname === "/events" || pathname.startsWith("/events/")
  const megaMenuToneClasses = [
    "bg-linear-to-r from-pp-green-soft to-white border-pp-green/30 hover:from-pp-green-soft hover:to-pp-slate-50",
    "bg-linear-to-r from-emerald-50 to-white border-emerald-200 hover:from-emerald-100 hover:to-white",
    "bg-linear-to-r from-sky-50 to-white border-sky-200 hover:from-sky-100 hover:to-white",
    "bg-linear-to-r from-pp-slate-100 to-white border-pp-slate-300 hover:from-pp-slate-200 hover:to-white",
  ]
  const headerLogo = isEventsRoute
    ? {
        src: "/Logo/Image-comm-news.png",
        alt: "Community News",
        width: 220,
        height: 72,
      }
    : {
        src: "/Logo/Pristine-Place-v2-final.png",
        alt: siteConfig.name,
        width: 240,
        height: 72,
      }

  return (
    <>
      {/* ── Top Bar (hides on scroll) ── */}
      <div
        className="bg-pp-navy-dark text-white overflow-hidden"
        style={{ fontSize: "var(--step--1)" }}
      >
        <div
          className="container flex items-center justify-between py-1.5 md:py-2"
          style={{
            transform: `translateY(${prefersReducedMotion ? (isScrolled ? -100 : 0) : -scrollProgress * 100}%)`,
            opacity: prefersReducedMotion ? (isScrolled ? 0 : 1) : 1 - scrollProgress,
            transition: prefersReducedMotion ? "transform 220ms ease, opacity 220ms ease" : undefined,
          }}
        >
          {/* Desktop left — phone */}
          <Link
            href={`tel:${siteConfig.contact.phoneRaw}`}
            className="hidden md:flex items-center gap-2 text-white hover:text-pp-green-light transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>{siteConfig.contact.phone}</span>
          </Link>

          {/* Mobile — phone + email */}
          <div className="flex md:hidden items-center gap-4 w-full justify-center">
            <Link
              href={`tel:${siteConfig.contact.phoneRaw}`}
              className="flex items-center gap-1.5 text-white hover:text-pp-green-light transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </Link>
            <span className="text-white/30">|</span>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 text-white/95 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-gold-light rounded-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact</span>
            </Link>
          </div>

          {/* Desktop right — location */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Spring%20Hill%2C%20FL"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/95 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-gold-light rounded-sm flex items-center gap-1"
              aria-label="Get directions to Spring Hill, Florida"
            >
              <MapPin className="w-3.5 h-3.5" />
              {siteConfig.contact.address.city}, {siteConfig.contact.address.state}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <header
        className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b transition-colors duration-300 ${
          isScrolled ? "shadow-md border-pp-slate-200" : "shadow-sm border-pp-slate-100"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-14 md:h-20" style={{ transformOrigin: "top center" }}>
            <div
              className="flex items-center justify-between w-full"
              style={{
                transform: `translateY(${prefersReducedMotion ? (isScrolled ? -2 : 0) : -scrollProgress * 2}px) scale(${prefersReducedMotion ? (isScrolled ? 0.96 : 1) : 1 - scrollProgress * 0.06})`,
                transition: prefersReducedMotion ? "transform 220ms ease" : undefined,
                willChange: prefersReducedMotion ? undefined : "transform",
              }}
            >
            {/* Logo / Site Name */}
            <Link href="/" className="flex items-center shrink-0" aria-label={`${siteConfig.name} home`}>
              <Image
                src={headerLogo.src}
                alt={headerLogo.alt}
                width={headerLogo.width}
                height={headerLogo.height}
                priority
                className="w-auto h-10 md:h-12"
              />
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              <Link
                href="/"
                className={`nav-link px-3 py-2 rounded-md transition-colors ${
                  isActive("/") ? "text-pp-navy-dark font-semibold bg-pp-slate-100" : ""
                }`}
                aria-current={isActive("/") ? "page" : undefined}
              >
                Home
              </Link>

              {/* Community Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleCommunityEnter}
                onMouseLeave={handleCommunityLeave}
              >
                <button
                  className="nav-link px-3 py-2 rounded-md transition-colors flex items-center gap-1 hover:text-pp-navy-dark"
                  aria-expanded={communityOpen}
                  aria-haspopup="true"
                  aria-label="Community menu"
                  onKeyDown={(e) =>
                    handleDropdownKeyDown(e, communityOpen, setCommunityOpen, setResidentsOpen, "Community menu")
                  }
                >
                  Community
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      communityOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {communityOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-[420px] bg-linear-to-b from-white to-pp-slate-50 border border-pp-slate-200 rounded-lg shadow-lg p-5 z-50"
                    role="menu"
                    aria-label="Community menu"
                    onKeyDown={(e) => handleMenuKeyDown(e, setCommunityOpen)}
                  >
                    <div className="space-y-3">
                      {siteConfig.megaNav.community.items.map((item, index) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block"
                          onClick={closeAll}
                        >
                          <div
                            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
                              "featured" in item && item.featured
                                ? "bg-linear-to-r from-pp-green-soft to-emerald-50 border-pp-green/40 hover:border-pp-green"
                                : megaMenuToneClasses[index % megaMenuToneClasses.length]
                            }`}
                          >
                            <h3 className="text-sm font-bold text-pp-navy-dark mb-1">
                              {item.label}
                            </h3>
                            <p className="text-xs text-pp-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Residents Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleResidentsEnter}
                onMouseLeave={handleResidentsLeave}
              >
                <button
                  className="nav-link px-3 py-2 rounded-md transition-colors flex items-center gap-1 hover:text-pp-navy-dark"
                  aria-expanded={residentsOpen}
                  aria-haspopup="true"
                  aria-label="Residents menu"
                  onKeyDown={(e) =>
                    handleDropdownKeyDown(e, residentsOpen, setResidentsOpen, setCommunityOpen, "Residents menu")
                  }
                >
                  Residents
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      residentsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {residentsOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-[420px] bg-linear-to-b from-white to-pp-slate-50 border border-pp-slate-200 rounded-lg shadow-lg p-5 z-50"
                    role="menu"
                    aria-label="Residents menu"
                    onKeyDown={(e) => handleMenuKeyDown(e, setResidentsOpen)}
                  >
                    <div className="space-y-3">
                      {siteConfig.megaNav.residents.items.map((item, index) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block"
                          onClick={closeAll}
                        >
                          <div
                            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
                              "featured" in item && item.featured
                                ? "bg-linear-to-r from-pp-green-soft to-emerald-50 border-pp-green/40 hover:border-pp-green"
                                : megaMenuToneClasses[index % megaMenuToneClasses.length]
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-pp-navy-dark mb-1">
                                {item.label}
                              </h3>
                              {"badge" in item && item.badge && (
                                <span className="bg-pp-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-pp-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-pp-slate-200">
                      <Link
                        href="/resident-portal"
                        className="flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: "var(--pp-navy-dark)" }}
                        onClick={closeAll}
                      >
                        Go to Resident Portal
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Links */}
              <Link
                href="/contact"
                className={`nav-link px-3 py-2 rounded-md transition-colors ${
                  isActive("/contact") ? "text-pp-navy-dark font-semibold bg-pp-slate-100" : ""
                }`}
                aria-current={isActive("/contact") ? "page" : undefined}
              >
                Contact
              </Link>

              {/* CTA */}
              <Link href="/resident-portal" className="btn btn-primary btn-sm ml-2">
                Resident Portal
              </Link>

              {isSignedIn && (
                <div
                  className="relative ml-1"
                  onMouseEnter={handleAccountEnter}
                  onMouseLeave={handleAccountLeave}
                >
                  <button
                    className="nav-link px-3 py-2 rounded-md transition-colors flex items-center gap-1 hover:text-pp-navy-dark"
                    aria-expanded={accountOpen}
                    aria-haspopup="true"
                    aria-label="My Account menu"
                    onKeyDown={(e) =>
                      handleDropdownKeyDown(e, accountOpen, setAccountOpen, setCommunityOpen, "My Account menu")
                    }
                  >
                    My Account
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        accountOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {accountOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 bg-white border border-pp-slate-200 rounded-lg shadow-lg p-2 z-50"
                      role="menu"
                      aria-label="My Account menu"
                      onKeyDown={(e) => handleMenuKeyDown(e, setAccountOpen)}
                    >
                      <button
                        type="button"
                        className="w-full text-left rounded-md px-3 py-2 text-sm font-medium text-pp-navy-dark hover:bg-pp-slate-100 flex items-center gap-2"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* ── Mobile: Quick Icons + Hamburger ── */}
            <div className="lg:hidden flex items-center gap-3">
              {/* Events icon — always visible */}
              <Link
                href="/events"
                className="flex flex-col items-center text-pp-navy-dark hover:text-pp-navy-dark transition-colors bg-pp-slate-100/90 px-2 py-1 rounded-md"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[9px] font-medium">Events</span>
              </Link>

              {/* Announcements icon — shows on scroll */}
              <Link
                href="/announcements"
                className={`flex flex-col items-center text-pp-navy-dark hover:text-pp-navy-dark transition-all duration-300 bg-pp-slate-100/90 px-2 py-1 rounded-md ${
                  isScrolled ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="text-[9px] font-medium">News</span>
              </Link>

              {/* Animated Hamburger */}
              <button
                className="relative w-8 h-8 focus:outline-none ml-1 rounded-md bg-linear-to-br from-pp-navy to-pp-navy-light text-white ring-1 ring-pp-gold/60 shadow-sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Toggle menu</span>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6">
                  <span
                    className={`block absolute right-0 h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out ${
                      mobileMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-2"
                    }`}
                  />
                  <span
                    className={`block absolute right-0 h-0.5 w-4 bg-current transform transition-all duration-300 ease-in-out ${
                      mobileMenuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`block absolute right-0 h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out ${
                      mobileMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-2"
                    }`}
                  />
                </div>
              </button>
            </div>
            </div>
          </div>

          {/* ── Mobile Menu ── */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-pp-slate-200 max-h-[calc(100vh-80px)] overflow-y-auto pb-24 bg-linear-to-b from-white via-pp-slate-50 to-white">
              <nav className="flex flex-col gap-1 py-4">
                <Link
                  href="/"
                  className="text-sm font-medium hover:text-pp-navy-dark px-3 py-2.5 rounded-md transition-colors hover:bg-pp-slate-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>

                {/* Community Accordion */}
                <div className="flex flex-col">
                  <button
                    className="text-sm font-medium hover:text-pp-navy-dark px-3 py-2.5 rounded-md transition-colors flex items-center justify-between hover:bg-pp-slate-100"
                    onClick={() => setMobileCommunityOpen(!mobileCommunityOpen)}
                  >
                    Community
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        mobileCommunityOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {mobileCommunityOpen && (
                    <div className="flex flex-col gap-2 mt-1 ml-3 mr-3">
                      {siteConfig.megaNav.community.items.map((item, index) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            className={`rounded-md p-3 border transition-colors ${
                              "featured" in item && item.featured
                                ? "bg-linear-to-r from-pp-green-soft to-emerald-50 border-pp-green/40 hover:border-pp-green"
                                : megaMenuToneClasses[index % megaMenuToneClasses.length]
                            }`}
                          >
                            <div className="text-sm font-semibold text-pp-navy-dark">
                              {item.label}
                            </div>
                            <div className="text-xs text-pp-slate-500">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Residents Accordion */}
                <div className="flex flex-col">
                  <button
                    className="text-sm font-medium hover:text-pp-navy-dark px-3 py-2.5 rounded-md transition-colors flex items-center justify-between hover:bg-pp-slate-100"
                    onClick={() => setMobileResidentsOpen(!mobileResidentsOpen)}
                  >
                    Residents
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        mobileResidentsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {mobileResidentsOpen && (
                    <div className="flex flex-col gap-2 mt-1 ml-3 mr-3">
                      {siteConfig.megaNav.residents.items.map((item, index) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            className={`rounded-md p-3 border transition-colors ${
                              "featured" in item && item.featured
                                ? "bg-linear-to-r from-pp-green-soft to-emerald-50 border-pp-green/40 hover:border-pp-green"
                                : megaMenuToneClasses[index % megaMenuToneClasses.length]
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-pp-navy-dark">
                                {item.label}
                              </span>
                              {"badge" in item && item.badge && (
                                <span className="bg-pp-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-pp-slate-500">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Links */}
                <Link
                  href="/contact"
                  className="text-sm font-medium hover:text-pp-navy-dark px-3 py-2.5 rounded-md transition-colors hover:bg-pp-slate-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>

                {/* CTA */}
                <Link
                  href="/resident-portal"
                  className="btn btn-primary text-center mt-3 mx-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Resident Portal
                </Link>

                {isSignedIn && (
                  <div className="flex flex-col mt-2">
                    <button
                      className="text-sm font-medium hover:text-pp-navy-dark px-3 py-2.5 rounded-md transition-colors flex items-center justify-between hover:bg-pp-slate-100"
                      onClick={() => setMobileAccountOpen(!mobileAccountOpen)}
                    >
                      My Account
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          mobileAccountOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {mobileAccountOpen && (
                      <div className="flex flex-col gap-2 mt-1 ml-3 mr-3">
                        <button
                          type="button"
                          className="w-full text-left rounded-md p-3 border bg-linear-to-r from-pp-slate-100 to-white border-pp-slate-300 hover:from-pp-slate-200 hover:to-white text-sm font-semibold text-pp-navy-dark flex items-center gap-2"
                          onClick={handleSignOut}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ── Sticky Footer Bar (appears on scroll) ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 shadow-2xl transition-all duration-300 ease-in-out ${
          isScrolled
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{
          background: "linear-gradient(135deg, #1f2f22, var(--pp-navy-dark), var(--pp-navy))",
          color: "var(--pp-white)",
          borderTop: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div className="container py-1.5 md:py-2.5 flex items-center justify-between">
          {/* Desktop — phone left, contact CTA right */}
          <Link
            href={`tel:${siteConfig.contact.phoneRaw}`}
            className="hidden md:flex items-center gap-2 hover:text-pp-gold-light transition-colors"
            style={{ fontSize: "var(--step--1)" }}
          >
            <Phone className="w-4 h-4" />
            <span>{siteConfig.contact.phone}</span>
          </Link>

          <div className="hidden md:flex items-center gap-4" style={{ fontSize: "var(--step--1)" }}>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Spring%20Hill%2C%20FL"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-gold-light rounded-sm flex items-center gap-1"
              aria-label="Get directions to Spring Hill, Florida"
            >
              <MapPin className="w-3.5 h-3.5" />
              {siteConfig.contact.address.city}, {siteConfig.contact.address.state}
            </a>
            <Link
              href="/contact"
              className="px-4 py-1.5 rounded text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-gold-light"
              style={{ backgroundColor: "var(--pp-gold-light)", color: "var(--pp-navy-dark)" }}
            >
              Contact Us
            </Link>
          </div>

          {/* Mobile — icon bar */}
          <div className="flex md:hidden items-center justify-around w-full">
            <Link
              href="/events"
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-medium">Events</span>
            </Link>
            <Link
              href="/announcements"
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <Bell className="w-4 h-4" />
              <span className="text-[10px] font-medium">News</span>
            </Link>
            <Link
              href="/documents"
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-medium">Docs</span>
            </Link>
            <Link
              href="/gate-access"
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-medium">Gate</span>
            </Link>
            <Link
              href={`tel:${siteConfig.contact.phoneRaw}`}
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <Phone className="w-4 h-4" />
              <span className="text-[10px] font-medium">Call</span>
            </Link>
            <Link
              href="/contact"
              className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 hover:text-pp-gold-light transition-colors text-center"
            >
              <Mail className="w-4 h-4" />
              <span className="text-[10px] font-medium">Contact</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
