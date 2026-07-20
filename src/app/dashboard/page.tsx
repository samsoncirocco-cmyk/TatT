import { redirect } from "next/navigation";

/**
 * The old dashboard was an old-theme demo page built entirely on fake
 * data (hardcoded "recent designs", fake artists, fake trending counts).
 * The user's real design home is /designs (localStorage + cloud sync),
 * so this route now redirects there. Old auth flows that push to
 * /dashboard keep working.
 */
export default function DashboardPage() {
  redirect("/designs");
}
