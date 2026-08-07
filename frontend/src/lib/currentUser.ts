import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

// There's no sign-in system yet — this app has exactly one local operator,
// so it acts as the active manager for the team-management and
// supplier-assignment actions that require one. The backend's permission
// check (backend/src/lib/permissions.ts) verifies this server-side and
// rejects the request if the id sent isn't really an active manager — this
// is not a substitute for real authentication, only a placeholder for the
// identity a signed-in session would otherwise provide. When real auth is
// added, this is the one place to swap for the authenticated user's id.
export function useActingManagerId(): string | undefined {
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: api.settings.team });
  return team?.find((m) => m.active && m.role === "Manager")?.id;
}
