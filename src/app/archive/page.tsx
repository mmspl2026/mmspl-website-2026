import { redirect } from "next/navigation";

// The mirrored legacy site lives as static files under /public/archive —
// this just gives /archive (no filename) a working entry point, since
// Next's static file serving doesn't do directory-index resolution the
// way a traditional web server would.
export default function ArchiveIndexPage() {
  redirect("/archive/index.html");
}
