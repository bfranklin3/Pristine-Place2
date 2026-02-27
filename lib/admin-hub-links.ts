export interface AdminHubLink {
  label: string
  href: string
  description: string
  environment?: "Local" | "Production" | "Shared"
}

export interface AdminHubSection {
  id: "hosting" | "code" | "auth" | "cms" | "database"
  title: string
  description: string
  links: AdminHubLink[]
}

// Central config for Admin Hub sections and quick links.
export const adminHubSections: AdminHubSection[] = [
  {
    id: "hosting",
    title: "Hosting",
    description: "Deployment and infrastructure controls.",
    links: [
      {
        label: "Vercel Dashboard",
        href: "https://vercel.com/login?next=%2Fb-franklins-projects%3Fplan%3Dpro",
        description: "Deployments, domains, and environment variables for production.",
        environment: "Production",
      },
    ],
  },
  {
    id: "code",
    title: "Code",
    description: "Source control and collaboration.",
    links: [
      {
        label: "GitHub Repository",
        href: "https://github.com/bfranklin3/Pristine-Place-HOA",
        description: "Source code, branches, pull requests, and issue tracking.",
        environment: "Shared",
      },
    ],
  },
  {
    id: "auth",
    title: "Auth",
    description: "Authentication and account administration.",
    links: [
      {
        label: "Clerk Dashboard",
        href: "https://dashboard.clerk.com/apps/app_3A230r18k22RupAICFkcpp3OrMB/instances/ins_3A230rBLpR8HqqGDmX42plXWXos/users",
        description: "User authentication, approvals, and account management.",
        environment: "Production",
      },
    ],
  },
  {
    id: "database",
    title: "Database (Neon)",
    description: "Primary Postgres database administration and monitoring.",
    links: [
      {
        label: "Neon Dashboard",
        href: "https://console.neon.tech/app/projects/winter-wildflower-60905510?database=neondb",
        description: "Branches, SQL editor, connections, and database observability for neondb.",
        environment: "Production",
      },
    ],
  },
  {
    id: "cms",
    title: "CMS",
    description: "Content platform administration and editing.",
    links: [
      {
        label: "Sanity Dashboard",
        href: "https://www.sanity.io/organizations/oJoSz33me/project/eyhh4qvh/api/cors-origins",
        description: "API settings, CORS origins, and project-level Sanity controls.",
        environment: "Production",
      },
      {
        label: "Sanity Studio",
        href: "http://localhost:3000/studio/structure/boardMember",
        description: "Content editing workspace for HOA site data.",
        environment: "Local",
      },
    ],
  },
]
