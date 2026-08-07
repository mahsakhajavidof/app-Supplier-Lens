import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: { settings: { team: vi.fn() } },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sidebar current-user widget", () => {
  test("shows the active manager's real name and initials, never a hardcoded demo name", async () => {
    vi.mocked(api.settings.team).mockResolvedValue([
      { id: "1", name: "Mohammad Khajavi", email: null, role: "Manager", initials: "MK", active: true },
      { id: "2", name: "Linda Roed", email: null, role: "Team member", initials: "LR", active: true },
    ]);
    renderSidebar();

    await screen.findByText("Mohammad Khajavi");
    expect(screen.getByText("MK")).toBeTruthy();
    expect(screen.queryByText("Marte Solberg")).toBeNull();
  });

  test("falls back gracefully when there is no active manager, without showing a demo name", async () => {
    vi.mocked(api.settings.team).mockResolvedValue([
      { id: "2", name: "Linda Roed", email: null, role: "Team member", initials: "LR", active: true },
    ]);
    renderSidebar();

    await waitFor(() => expect(screen.getByText("Unassigned")).toBeTruthy());
    expect(screen.queryByText("Marte Solberg")).toBeNull();
  });
});
