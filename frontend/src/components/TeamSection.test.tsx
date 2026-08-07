import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamSection } from "./TeamSection";
import { ToastProvider } from "../lib/toast";
import { api } from "../lib/api";
import type { TeamMember } from "../types";

vi.mock("../lib/api", () => ({
  api: {
    settings: { addTeamMember: vi.fn(), updateTeamMember: vi.fn() },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MANAGER = "manager-1";

function member(overrides: Partial<TeamMember>): TeamMember {
  return { id: "m1", name: "Someone", email: null, role: "Team member", initials: "SO", active: true, assignedCount: 0, ...overrides };
}

function renderSection(team: TeamMember[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TeamSection team={team} actingUserId={MANAGER} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("TeamSection", () => {
  test("adding a member calls addTeamMember with the trimmed name/role and the acting manager's id", async () => {
    vi.mocked(api.settings.addTeamMember).mockResolvedValue(member({ id: "new" }));
    renderSection([]);

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "  New Person  " } });
    fireEvent.change(screen.getByPlaceholderText("Role (e.g. Team member)"), { target: { value: "  Finance  " } });
    fireEvent.click(screen.getByText("Add member"));

    await waitFor(() =>
      expect(api.settings.addTeamMember).toHaveBeenCalledWith({ name: "New Person", role: "Finance" }, MANAGER)
    );
  });

  test("editing a member saves the new name and role", async () => {
    vi.mocked(api.settings.updateTeamMember).mockResolvedValue(member({}));
    renderSection([member({ id: "m1", name: "Old Name", role: "Old Role" })]);

    fireEvent.click(screen.getByText("Edit"));
    const inputs = screen.getAllByDisplayValue(/Old Name|Old Role/);
    fireEvent.change(inputs.find((i) => (i as HTMLInputElement).value === "Old Name")!, { target: { value: "New Name" } });
    fireEvent.change(inputs.find((i) => (i as HTMLInputElement).value === "Old Role")!, { target: { value: "New Role" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(api.settings.updateTeamMember).toHaveBeenCalledWith(
        "m1",
        { name: "New Name", role: "New Role" },
        MANAGER
      )
    );
  });

  test("activating an inactive member calls updateTeamMember directly, with no reassignment picker", async () => {
    vi.mocked(api.settings.updateTeamMember).mockResolvedValue(member({}));
    renderSection([member({ id: "m1", name: "Inactive Person", active: false })]);

    expect(screen.getByText("Inactive")).toBeTruthy();
    fireEvent.click(screen.getByText("Activate"));

    await waitFor(() =>
      expect(api.settings.updateTeamMember).toHaveBeenCalledWith("m1", { active: true }, MANAGER)
    );
  });

  test("deactivating offers only other active members to reassign to, and requires picking one", async () => {
    vi.mocked(api.settings.updateTeamMember).mockResolvedValue(member({}));
    renderSection([
      member({ id: "m1", name: "Leaving Person" }),
      member({ id: "m2", name: "Active Peer" }),
      member({ id: "m3", name: "Inactive Peer", active: false }),
    ]);

    const rows = screen.getAllByText("Deactivate");
    fireEvent.click(rows[0]);

    const picker = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(picker.options).map((o) => o.textContent);
    expect(options).toContain("Active Peer");
    expect(options).not.toContain("Leaving Person");
    expect(options).not.toContain("Inactive Peer");

    fireEvent.change(picker, { target: { value: "m2" } });
    fireEvent.click(screen.getByText("Confirm deactivation"));

    await waitFor(() =>
      expect(api.settings.updateTeamMember).toHaveBeenCalledWith("m1", { active: false, reassignToId: "m2" }, MANAGER)
    );
  });
});
