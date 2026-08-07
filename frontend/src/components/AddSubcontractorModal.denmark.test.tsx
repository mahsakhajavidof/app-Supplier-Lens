import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddSubcontractorModal } from "./AddSubcontractorModal";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    settings: { team: vi.fn(), registries: vi.fn() },
    subcontractors: { create: vi.fn() },
    registry: { search: vi.fn(), lookup: vi.fn() },
  },
}));

const REGISTRIES = [
  { country: "NO", registryName: "Brønnøysundregistrene (Enhetsregisteret)", configured: true },
  { country: "GB", registryName: "Companies House", configured: true },
  { country: "DK", registryName: "Danish CVR via APICVR", configured: true },
];

const NOVO_SUGGESTION = { orgNr: "24256790", name: "NOVO NORDISK A/S", legalForm: "A/S", address: "Bagsvaerd" };
const NOVO_LOOKUP = {
  orgNr: "24256790",
  country: "DK",
  name: "NOVO NORDISK A/S",
  companyStatus: "NORMAL",
  legalForm: "Aktieselskab (A/S)",
  registeredOn: "1989-01-01",
  employees: 27975,
  vatRegistered: true,
  address: "Novo Alle 1, 2880 Bagsvaerd",
  contactPhone: "44448888",
};

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddSubcontractorModal onClose={vi.fn()} onCreated={vi.fn()} />
    </QueryClientProvider>
  );
}

async function selectCountry(label: string, value: string) {
  await screen.findByRole("option", { name: label });
  fireEvent.change(screen.getByDisplayValue(/Select country…|Norway|United Kingdom|Denmark/), { target: { value } });
}

beforeEach(() => {
  vi.mocked(api.settings.team).mockResolvedValue([]);
  vi.mocked(api.settings.registries).mockResolvedValue(REGISTRIES);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AddSubcontractorModal Denmark support", () => {
  test("Denmark is offered as a country option, labeled by name rather than its raw code", async () => {
    renderModal();
    await screen.findByRole("option", { name: "Denmark" });
  });

  test("selecting Denmark searches the Danish registry by CVR/name", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([NOVO_SUGGESTION]);
    renderModal();
    await selectCountry("Denmark", "DK");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Novo Nordisk" },
    });
    await waitFor(() => expect(api.registry.search).toHaveBeenCalledWith("DK", "Novo Nordisk"));
  });

  test("picking a Danish suggestion fills in the CVR and auto-triggers the lookup", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([NOVO_SUGGESTION]);
    vi.mocked(api.registry.lookup).mockResolvedValue(NOVO_LOOKUP);
    renderModal();
    await selectCountry("Denmark", "DK");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Novo Nordisk" },
    });
    const suggestion = await screen.findByText("NOVO NORDISK A/S");
    fireEvent.mouseDown(suggestion);

    await waitFor(() => expect(api.registry.lookup).toHaveBeenCalledWith("DK", "24256790"));
    await screen.findByText(/Company found: NOVO NORDISK A\/S/);
    expect(screen.getByDisplayValue("24256790")).toBeTruthy();
  });

  test("the confirmation panel displays employee count and contact phone when APICVR returns them", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([NOVO_SUGGESTION]);
    vi.mocked(api.registry.lookup).mockResolvedValue(NOVO_LOOKUP);
    renderModal();
    await selectCountry("Denmark", "DK");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Novo Nordisk" },
    });
    const suggestion = await screen.findByText("NOVO NORDISK A/S");
    fireEvent.mouseDown(suggestion);

    await screen.findByText(/Company found:/);
    expect(screen.getByText(/Employees: 27975/)).toBeTruthy();
    expect(screen.getByText(/Contact phone: 44448888/)).toBeTruthy();
  });

  test("a genuine Danish registry outage is shown as an error, never as an empty result", async () => {
    vi.mocked(api.registry.search).mockRejectedValue(new Error("APICVR search failed (503)"));
    renderModal();
    await selectCountry("Denmark", "DK");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Novo Nordisk" },
    });
    await screen.findByText(/APICVR search failed/);
  });
});
