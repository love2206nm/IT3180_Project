/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-must-not-depend-on-outer-layers",
      comment: "Clean Architecture: Domain layer must be pure and independent of all outer layers.",
      severity: "error",
      from: {
        path: "^src/domain",
      },
      to: {
        path: "^src/(application|infrastructure|presentation|app)",
      },
    },
    {
      name: "application-must-not-depend-on-infrastructure-or-presentation",
      comment: "Clean Architecture: Application layer (Use Cases) must only depend on Domain, never directly on Infrastructure or UI.",
      severity: "error",
      from: {
        path: "^src/application",
      },
      to: {
        path: "^src/(infrastructure|presentation|app)",
      },
    },
    {
      name: "presentation-must-not-directly-import-database",
      comment: "Clean Architecture: UI / Presentation layer must access data through Application Use Cases, never bypass to DB.",
      severity: "error",
      from: {
        path: "^src/(presentation|app)",
      },
      to: {
        path: "^src/infrastructure/database",
      },
    },
    {
      name: "no-circular-dependencies",
      comment: "Disallow any circular dependency across the codebase.",
      severity: "error",
      from: {
        pathNot: "^(node_modules)",
      },
      to: {
        circular: true,
      },
    },
    {
      name: "client-components-must-not-import-server-or-db",
      comment: "Next.js Security: Client Components ('use client') must never import DB models, Prisma client or secrets.",
      severity: "error",
      from: {
        path: "^src/(presentation|app)",
        // Match files containing 'use client' or in client directories
      },
      to: {
        path: "(prisma|database|storage|security)",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
