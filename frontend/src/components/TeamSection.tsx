import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Card, CardHeader } from "./Card";
import { Button } from "./Button";
import { inputClass } from "./Modal";
import type { TeamMember } from "../types";

// The "Team" card on the Settings page: list, add, edit, and
// activate/deactivate team members. Manager-gated on the backend (see
// backend/src/lib/permissions.ts) — see frontend/src/lib/currentUser.ts for
// why this always acts as the manager for now.
export function TeamSection({ team, actingUserId }: { team: TeamMember[]; actingUserId?: string }) {
  const queryClient = useQueryClient();
  const { flash } = useToast();
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [error, setError] = useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["team"] });
  }

  async function addMember() {
    if (!addName.trim() || !addRole.trim() || !actingUserId) return;
    setError("");
    try {
      await api.settings.addTeamMember({ name: addName.trim(), role: addRole.trim() }, actingUserId);
      setAddName("");
      setAddRole("");
      invalidate();
      flash("Team member added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add team member");
    }
  }

  function startEdit(m: TeamMember) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role);
    setDeactivatingId(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editRole.trim() || !actingUserId) return;
    setError("");
    try {
      await api.settings.updateTeamMember(id, { name: editName.trim(), role: editRole.trim() }, actingUserId);
      setEditingId(null);
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update team member");
    }
  }

  async function activate(m: TeamMember) {
    if (!actingUserId) return;
    setError("");
    try {
      await api.settings.updateTeamMember(m.id, { active: true }, actingUserId);
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate team member");
    }
  }

  function startDeactivate(m: TeamMember) {
    setDeactivatingId(m.id);
    setReassignToId("");
    setEditingId(null);
  }

  async function confirmDeactivate(id: string) {
    if (!actingUserId) return;
    setError("");
    try {
      await api.settings.updateTeamMember(
        id,
        { active: false, ...(reassignToId ? { reassignToId } : {}) },
        actingUserId
      );
      setDeactivatingId(null);
      invalidate();
      flash("Team member deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate — reassign their work first");
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Team" />
      {team.map((m) => (
        <div key={m.id} className="flex flex-col gap-2.5 border-b border-border px-5 py-3.5 last:border-b-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-chip text-[11.5px] font-semibold text-link">
              {m.initials}
            </div>
            {editingId === m.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input className={inputClass} value={editRole} onChange={(e) => setEditRole(e.target.value)} />
                <Button onClick={() => saveEdit(m.id)}>Save</Button>
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px] font-medium">{m.name}</span>
                  <span className="text-xs text-muted">{m.email ?? "No email on file"}</span>
                </div>
                <span className="text-[12.5px] text-muted">{m.role}</span>
                <span className="text-xs text-muted">{m.assignedCount ?? 0} assigned</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                    m.active ? "bg-neutral-bg text-neutral-fg" : "bg-warn-bg text-warn-fg"
                  }`}
                >
                  {m.active ? "Active" : "Inactive"}
                </span>
                <Button onClick={() => startEdit(m)}>Edit</Button>
                {m.active ? (
                  <Button onClick={() => startDeactivate(m)}>Deactivate</Button>
                ) : (
                  <Button onClick={() => activate(m)}>Activate</Button>
                )}
              </>
            )}
          </div>
          {deactivatingId === m.id && (
            <div className="flex items-center gap-2 rounded-md bg-surface-subtle px-3.5 py-2.5">
              <span className="text-[12.5px] text-muted">Reassign their suppliers and open tasks to:</span>
              <select className={inputClass} value={reassignToId} onChange={(e) => setReassignToId(e.target.value)}>
                <option value="">Select a team member…</option>
                {team
                  .filter((other) => other.active && other.id !== m.id)
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.name}
                    </option>
                  ))}
              </select>
              <Button variant="primary" onClick={() => confirmDeactivate(m.id)}>
                Confirm deactivation
              </Button>
              <Button onClick={() => setDeactivatingId(null)}>Cancel</Button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 px-5 py-3.5">
        <input
          className={inputClass}
          placeholder="Name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Role (e.g. Team member)"
          value={addRole}
          onChange={(e) => setAddRole(e.target.value)}
        />
        <Button variant="primary" onClick={addMember} disabled={!addName.trim() || !addRole.trim()}>
          Add member
        </Button>
      </div>
      {error && <p className="px-5 pb-3.5 text-[12.5px] text-danger-fg">{error}</p>}
    </Card>
  );
}
