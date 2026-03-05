// components/portal/portal-header.tsx
// Portal navigation — dark-navy header, distinct from public site header.
// Management section is visible during development; auth gating is added when
// authentication is implemented (search for "TODO: auth gate").

"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useClerk } from "@clerk/nextjs"
import { ChevronDown, LogOut, ExternalLink, Menu, X, Shield, House, CreditCard, CalendarDays, Search } from "lucide-react"
import { SearchModal } from "./search-modal"
import type { CommitteeSlug } from "@/lib/portal/committees"

/* ── Nav Data ────────────────────────────────────────────────────── */

const communityItems = [
  { label: "Board of Directors",  href: "/resident-portal/board",          description: "Meet your HOA board members" },
  { label: "Committees",          href: "/resident-portal/committees",      description: "Standing committees and their roles" },
  { label: "ACC",                 href: "/resident-portal/acc",             description: "Architectural Control Committee" },
  { label: "Access Control",      href: "/resident-portal/access-control",  description: "Gate access and visitor management" },
  { label: "Clubhouse",           href: "/resident-portal/clubhouse",       description: "Clubhouse information and reservations" },
  { label: "Crime Watch",         href: "/resident-portal/crime-watch",     description: "Community safety and neighborhood watch" },
]

const resourceItems = [
  { label: "HOA Documents",                href: "/resident-portal/documents",              description: "Governing docs and official policies" },
  { label: "Exterior Modifications Guide", href: "/resident-portal/exterior-modifications", description: "Rules for home improvements and additions" },
  { label: "Leasing Rules",                href: "/resident-portal/leasing-rules",          description: "Rental and leasing requirements" },
  { label: "About the HOA",                href: "/resident-portal/about",                  description: "History and mission of Pristine Place" },
  { label: "Community Resources",          href: "/resident-portal/community-resources",    description: "Local services and area information" },
  { label: "Newsletters",                  href: "/resident-portal/newsletters",            description: "Community newsletters archive" },
]

const serviceItems = [
  { label: "Submit ACC Request",        href: "/resident-portal/acc/submit",       description: "Apply for architectural modifications" },
  { label: "Clubhouse Rental Request",  href: "/resident-portal/clubhouse/rental", description: "Reserve the clubhouse for an event" },
  { label: "Pay HOA Fees",              href: "/resident-portal/pay-fees",          description: "Make an assessment payment online" },
  { label: "Report an Issue",           href: "/resident-portal/report-issue",      description: "Report a common area maintenance issue" },
  { label: "Contact the Board",         href: "/resident-portal/contact-board",     description: "Send a message to board members" },
  { label: "Manage My Notifications",   href: "/resident-portal/notifications",     description: "Set your communication preferences" },
]

const managementItems = [
  {
    label: "Admin Hub",
    href: "/resident-portal/management/admin-hub",
    description: "Administration tools and platform dashboards",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Email Test",
    href: "/resident-portal/management/test-email",
    description: "Send and diagnose outbound email delivery",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "ACC Workflow Queue",
    href: "/resident-portal/management/acc-queue",
    description: "Neon-backed ACC workflow queue (target state)",
    allowed: ["admin", "acc"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "ACC Match Review",
    href: "/resident-portal/management/acc-match-review",
    description: "Review and confirm ACC-to-resident match candidates",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "ACC Unmatched Queue",
    href: "/resident-portal/management/acc-unmatched",
    description: "Operational queue for unresolved ACC-to-resident matching",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "ACC Link Review",
    href: "/resident-portal/management/acc-link-review",
    description: "Resolve unresolved/low-confidence ACC residency links",
    allowed: ["admin", "acc", "access_control", "board_of_directors"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "ACC Workflow Queue Wordpress",
    href: "/resident-portal/management/wp-acc-queue",
    description: "Review ACC applications (ACC committee)",
    allowed: ["admin", "acc"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Resident Access Management",
    href: "/resident-portal/management/access",
    description: "Manage gate access (Access Control committee)",
    allowed: ["admin", "access_control"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Resident 360 Lookup",
    href: "/resident-portal/management/resident-360",
    description: "Unified resident profile + gate credentials + ACC history",
    allowed: ["admin", "acc", "access_control", "board_of_directors"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Resident Access Management Wordpress",
    href: "/resident-portal/management/wp-access",
    description: "Temporary WordPress-based gate access management",
    allowed: ["admin", "access_control"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Resident Approval Queue",
    href: "/resident-portal/management/resident-approvals",
    description: "Approve or reject resident portal requests",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "User Management Wordpress",
    href: "/resident-portal/management/wp-users",
    description: "Manage resident accounts (admin only)",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
  {
    label: "Portal User Management",
    href: "/resident-portal/management/users",
    description: "Manage portal users, approvals, committees, and capabilities",
    allowed: ["admin"] as Array<CommitteeSlug | "admin">,
  },
]

/* ── Types ───────────────────────────────────────────────────────── */

type DropdownKey = "community" | "resources" | "services" | "management" | "account" | null

/* ── Component ───────────────────────────────────────────────────── */

export function PortalHeader({ isAdmin, committees }: { isAdmin: boolean; committees: CommitteeSlug[] }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const visibleManagementItems = managementItems.filter(
    (item) => item.allowed.includes("admin") && isAdmin || item.allowed.some((role) => role !== "admin" && committees.includes(role)),
  )
  const hasVisibleManagementItems = visibleManagementItems.length > 0

  // Desktop — single open dropdown tracked by key
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null)
  const [closeTimer, setCloseTimer]   = useState<NodeJS.Timeout | null>(null)

  // Mobile
  const [mobileOpen, setMobileOpen]               = useState(false)
  const [mobileCommunity, setMobileCommunity]     = useState(false)
  const [mobileResources, setMobileResources]     = useState(false)
  const [mobileServices, setMobileServices]       = useState(false)
  const [mobileManagement, setMobileManagement]   = useState(false)
  const [mobileAccount, setMobileAccount]         = useState(false)

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false)

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  // Keyboard shortcuts for search (/, Cmd+K, Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
      // Forward slash (/) - but not when typing in an input
      else if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  /* ── Desktop hover handlers ── */
  const handleEnter = (key: DropdownKey) => {
    if (closeTimer) { clearTimeout(closeTimer); setCloseTimer(null) }
    setOpenDropdown(key)
  }
  const handleLeave = () => {
    const t = setTimeout(() => setOpenDropdown(null), 300)
    setCloseTimer(t)
  }
  const closeAll = () => {
    setOpenDropdown(null)
    if (closeTimer) { clearTimeout(closeTimer); setCloseTimer(null) }
  }

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" })
  }

  /* ── Helpers ── */
  const isActive = (href: string) => pathname === href

  const navLinkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(href)
        ? "text-pp-gold-light bg-white/10"
        : "text-white/90 hover:text-pp-gold-light hover:bg-white/10"
    }`

  const dropdownBtnClass = (key: DropdownKey) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
      openDropdown === key
        ? "text-pp-gold-light bg-white/10"
        : "text-white/90 hover:text-pp-gold-light hover:bg-white/10"
    }`

  /* ── Reusable desktop dropdown panel ── */
  const DropdownPanel = ({ items }: { items: typeof communityItems }) => (
    <div
      className="absolute left-0 top-full mt-1 w-72 bg-white border border-pp-slate-200 rounded-lg shadow-xl overflow-hidden z-50"
      role="menu"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="block px-4 py-2.5 hover:bg-pp-slate-50 border-b border-pp-slate-100 last:border-0 transition-colors"
          onClick={closeAll}
          role="menuitem"
        >
          <div className="text-sm font-semibold text-pp-navy-dark">{item.label}</div>
          <div className="text-xs text-pp-slate-500 mt-0.5">{item.description}</div>
        </Link>
      ))}
    </div>
  )

  /* ── Reusable mobile accordion section ── */
  const MobileSection = ({
    label,
    items,
    isOpen,
    toggle,
    accent,
  }: {
    label: string
    items: typeof communityItems
    isOpen: boolean
    toggle: () => void
    accent?: boolean
  }) => (
    <div className="flex flex-col">
      <button
        className={`px-3 py-2.5 text-sm font-medium flex items-center justify-between rounded-md transition-colors ${
          accent
            ? "text-pp-gold-light/90 hover:text-pp-gold-light hover:bg-white/10"
            : "text-white/90 hover:text-pp-gold-light hover:bg-white/10"
        }`}
        onClick={toggle}
      >
        <span className="flex items-center gap-2">
          {accent && <Shield className="w-3.5 h-3.5" />}
          {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="flex flex-col ml-3 mr-1 mt-1 mb-2 rounded-lg overflow-hidden border border-white/10">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-4 py-2.5 text-sm text-white/80 hover:text-pp-gold-light hover:bg-white/10 border-b border-white/10 last:border-0 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-white/50 mt-0.5">{item.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Render ── */
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "var(--pp-navy-dark)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between h-14 md:h-16">

          {/* ── Logo ── */}
          <Link
            href="/resident-portal"
            className="flex items-center shrink-0"
            aria-label="Resident Portal home"
          >
            <Image
              src="/Logo/Pristine-Place-v2-final.png"
              alt="Pristine Place Resident Portal"
              width={180}
              height={56}
              priority
              className="h-8 md:h-9 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </Link>

          {/* ── Desktop Navigation ── */}
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Portal navigation">

            {/* Home */}
            <Link
              href="/resident-portal"
              className={navLinkClass("/resident-portal")}
              aria-current={isActive("/resident-portal") ? "page" : undefined}
            >
              Home
            </Link>

            {/* Community */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("community")}
              onMouseLeave={handleLeave}
            >
              <button
                className={dropdownBtnClass("community")}
                aria-expanded={openDropdown === "community"}
                aria-haspopup="true"
                aria-label="Community menu"
              >
                Community
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === "community" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "community" && <DropdownPanel items={communityItems} />}
            </div>

            {/* Resources */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("resources")}
              onMouseLeave={handleLeave}
            >
              <button
                className={dropdownBtnClass("resources")}
                aria-expanded={openDropdown === "resources"}
                aria-haspopup="true"
                aria-label="Resources menu"
              >
                Resources
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === "resources" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "resources" && <DropdownPanel items={resourceItems} />}
            </div>

            {/* Events — direct link */}
            <Link
              href="/resident-portal/events"
              className={navLinkClass("/events")}
              aria-current={isActive("/resident-portal/events") ? "page" : undefined}
            >
              Events
            </Link>

            {/* Services */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("services")}
              onMouseLeave={handleLeave}
            >
              <button
                className={dropdownBtnClass("services")}
                aria-expanded={openDropdown === "services"}
                aria-haspopup="true"
                aria-label="Services menu"
              >
                Services
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === "services" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "services" && <DropdownPanel items={serviceItems} />}
            </div>

            {hasVisibleManagementItems && (
              <div
                className="relative"
                onMouseEnter={() => handleEnter("management")}
                onMouseLeave={handleLeave}
              >
                <button
                  className={`${dropdownBtnClass("management")} text-pp-gold-light/80 hover:text-pp-gold-light`}
                  aria-expanded={openDropdown === "management"}
                  aria-haspopup="true"
                  aria-label="Management menu"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Management
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === "management" ? "rotate-180" : ""}`} />
                </button>
                {openDropdown === "management" && <DropdownPanel items={visibleManagementItems} />}
              </div>
            )}

            {/* Divider */}
            <span className="w-px h-5 bg-white/20 mx-1.5" aria-hidden />

            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="px-3 py-2 rounded-md text-sm text-white/90 hover:text-pp-gold-light hover:bg-white/10 transition-colors flex items-center gap-1.5"
              aria-label="Search portal (press / or Cmd+K)"
              title="Search (/ or ⌘K)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden xl:inline">Search</span>
            </button>

            {/* ← Public Site */}
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Site
            </Link>

            {/* My Account */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("account")}
              onMouseLeave={handleLeave}
            >
              <button
                className={dropdownBtnClass("account")}
                aria-expanded={openDropdown === "account"}
                aria-haspopup="true"
                aria-label="My Account menu"
              >
                My Account
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === "account" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "account" && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 bg-white border border-pp-slate-200 rounded-lg shadow-xl overflow-hidden z-50"
                  role="menu"
                >
                  {/* Future: Profile, Notification Preferences */}
                  <div className="px-4 py-2 text-xs text-pp-slate-400 border-b border-pp-slate-100 uppercase tracking-wide">
                    Account
                  </div>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-pp-slate-700 hover:bg-pp-slate-50 hover:text-pp-navy-dark transition-colors flex items-center gap-2"
                    onClick={handleSignOut}
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

          </nav>

          {/* ── Mobile: Quick Icons + Hamburger ── */}
          <div className="lg:hidden flex items-center gap-1">

            <Link
              href="/resident-portal"
              className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
                isActive("/resident-portal")
                  ? "text-pp-gold-light bg-white/10"
                  : "text-white/70 hover:text-pp-gold-light hover:bg-white/10"
              }`}
              aria-label="Dashboard home"
              title="Home"
            >
              <House className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-md transition-colors text-white/70 hover:text-pp-gold-light hover:bg-white/10"
              aria-label="Search portal"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <Link
              href="/resident-portal/pay-fees"
              className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
                isActive("/resident-portal/pay-fees")
                  ? "text-pp-gold-light bg-white/10"
                  : "text-white/70 hover:text-pp-gold-light hover:bg-white/10"
              }`}
              aria-label="Pay HOA Fees"
              title="Pay HOA Fees"
            >
              <CreditCard className="w-5 h-5" />
            </Link>

            <Link
              href="/resident-portal/events"
              className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
                isActive("/resident-portal/events")
                  ? "text-pp-gold-light bg-white/10"
                  : "text-white/70 hover:text-pp-gold-light hover:bg-white/10"
              }`}
              aria-label="Events calendar"
              title="Events"
            >
              <CalendarDays className="w-5 h-5" />
            </Link>

            <span className="w-px h-5 bg-white/20 mx-0.5" aria-hidden />

            <button
              className="flex items-center justify-center w-9 h-9 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* ── Mobile Drawer ── */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 max-h-[calc(100vh-56px)] overflow-y-auto pb-8">
            <nav className="flex flex-col gap-0.5 py-3">

              {/* Home */}
              <Link
                href="/resident-portal"
                className="px-3 py-2.5 text-sm font-medium text-white/90 hover:text-pp-gold-light hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>

              {/* Community */}
              <MobileSection
                label="Community"
                items={communityItems}
                isOpen={mobileCommunity}
                toggle={() => setMobileCommunity(!mobileCommunity)}
              />

              {/* Resources */}
              <MobileSection
                label="Resources"
                items={resourceItems}
                isOpen={mobileResources}
                toggle={() => setMobileResources(!mobileResources)}
              />

              {/* Events */}
              <Link
                href="/resident-portal/events"
                className="px-3 py-2.5 text-sm font-medium text-white/90 hover:text-pp-gold-light hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Events
              </Link>

              {/* Services */}
              <MobileSection
                label="Services"
                items={serviceItems}
                isOpen={mobileServices}
                toggle={() => setMobileServices(!mobileServices)}
              />

              {hasVisibleManagementItems && (
                <MobileSection
                  label="Management"
                  items={visibleManagementItems}
                  isOpen={mobileManagement}
                  toggle={() => setMobileManagement(!mobileManagement)}
                  accent
                />
              )}

              {/* Divider */}
              <hr className="my-2 border-white/10" />

              {/* Public Site */}
              <Link
                href="/"
                className="px-3 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <ExternalLink className="w-4 h-4" />
                ← Back to Public Site
              </Link>

              {/* My Account */}
              <div className="flex flex-col">
                <button
                  className="px-3 py-2.5 text-sm font-medium text-white/90 hover:text-pp-gold-light hover:bg-white/10 rounded-md transition-colors flex items-center justify-between"
                  onClick={() => setMobileAccount(!mobileAccount)}
                >
                  My Account
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileAccount ? "rotate-180" : ""}`} />
                </button>
                {mobileAccount && (
                  <div className="ml-3 mr-1 mt-1 mb-2 rounded-lg overflow-hidden border border-white/10">
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:text-pp-gold-light hover:bg-white/10 transition-colors flex items-center gap-2"
                      onClick={async () => {
                        setMobileOpen(false)
                        await handleSignOut()
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

            </nav>
          </div>
        )}

      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
