import type { Metadata } from "next";

// "Add to Home Screen" shortcuts for the admin and team portal — distinct
// manifest/icon per section so each shows up as its own app, not generic
// MMSPL branding. Spread into each page's `metadata` export alongside its
// own `title`.

export const ADMIN_APP_METADATA: Partial<Metadata> = {
  manifest: "/manifest-admin.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Scores" },
  icons: {
    icon: [
      { url: "/icon-admin-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-admin-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-admin-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const ADMIN_DATA_APP_METADATA: Partial<Metadata> = {
  manifest: "/manifest-admin-data.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Data Admin" },
  icons: {
    icon: [
      { url: "/icon-admin-data-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-admin-data-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-admin-data-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const TEAM_APP_METADATA: Partial<Metadata> = {
  manifest: "/manifest-team.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Captain's Portal" },
  icons: {
    icon: [
      { url: "/icon-team-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-team-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-team-apple.png", sizes: "180x180", type: "image/png" }],
  },
};
