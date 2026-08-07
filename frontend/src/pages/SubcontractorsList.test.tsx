import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SubcontractorsList } from "./SubcontractorsList";
import { ToastProvider } from "../lib/toast";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    settings: { team: vi.fn(), registries: vi.fn() },
    subcontractors: { list: vi.fn(), filters: vi.fn(), create: vi.fn() },
    registry: { search: vi.fn(), lookup: vi.fn() },
  },
}));

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <SubcontractorsList />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(api.settings.team).mockResolvedValue([]);
  vi.mocked(api.settings.registries).mockResolvedValue([
    { country: "NO", registryName: "Brønnøysundregistrene (Enhetsregisteret)", configured: true },
  ]);
  vi.mocked(api.subcontractors.list).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SubcontractorsList category filter", () => {
  test("a legacy category not in the predefined list still appears in the category filter (existing data is untouched)", async () => {
    vi.mocked(api.subcontractors.filters).mockResolvedValue({ categories: ["Electrical"], owners: [] });
    renderList();
    await screen.findByRole("option", { name: "Electrical" });
  });

  test("a custom category created through 'Other' appears in the category filter after creation", async () => {
    vi.mocked(api.subcontractors.filters)
      .mockResolvedValueOnce({ categories: [], owners: [] })
      .mockResolvedValueOnce({ categories: ["Diving Support"], owners: [] });
    vi.mocked(api.registry.search).mockResolvedValue([]);
    vi.mocked(api.subcontractors.create).mockResolvedValue({
      id: "1",
      company: "Acme AS",
      orgNr: "923609016",
      country: "NO",
      category: "Diving Support",
    } as never);

    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Add subcontractor" }));

    const modal = within(document.querySelector("div.fixed.inset-0.z-40") as HTMLElement);
    await modal.findByRole("option", { name: "Norway" });
    fireEvent.change(modal.getByDisplayValue("Select country…"), { target: { value: "NO" } });
    fireEvent.change(modal.getByPlaceholderText("e.g. 923609016"), { target: { value: "923609016" } });
    fireEvent.change(modal.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Acme AS" },
    });
    fireEvent.change(modal.getByLabelText("Category"), { target: { value: "Other" } });
    fireEvent.change(modal.getByLabelText("Custom category"), { target: { value: "Diving Support" } });
    fireEvent.click(modal.getByRole("button", { name: "Add subcontractor" }));

    await waitFor(() => expect(api.subcontractors.create).toHaveBeenCalled());
    await waitFor(() => {
      const filterSelect = screen.getByDisplayValue("All categories") as HTMLSelectElement;
      const options = Array.from(filterSelect.options).map((o) => o.value);
      expect(options).toContain("Diving Support");
    });
  });
});
