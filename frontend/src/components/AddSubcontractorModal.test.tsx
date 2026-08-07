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
];

const EQUINOR_SUGGESTION = { orgNr: "923609016", name: "EQUINOR ASA", legalForm: "ASA", address: "Stavanger" };
const EQUINOR_LOOKUP = {
  orgNr: "923609016",
  country: "NO",
  name: "EQUINOR ASA",
  companyStatus: "Registered and active",
  legalForm: "Allmennaksjeselskap (ASA)",
  registeredOn: "1995-03-12",
  vatRegistered: true,
  address: "Forusbeen 50, Stavanger",
};
const TESCO_SUGGESTION = { orgNr: "00445790", name: "TESCO PLC", legalForm: "plc", address: "Welwyn Garden City" };

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
  fireEvent.change(screen.getByDisplayValue(/Select country…|Norway|United Kingdom/), { target: { value } });
}

beforeEach(() => {
  vi.mocked(api.settings.team).mockResolvedValue([]);
  vi.mocked(api.settings.registries).mockResolvedValue(REGISTRIES);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AddSubcontractorModal registry search and lookup", () => {
  test("selecting a country searches that country's registry", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([EQUINOR_SUGGESTION]);
    renderModal();
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Equinor" },
    });
    await waitFor(() => expect(api.registry.search).toHaveBeenCalledWith("NO", "Equinor"));
  });

  test("suggestions come from the selected country only", async () => {
    vi.mocked(api.registry.search).mockImplementation(async (country: string) =>
      country === "NO" ? [EQUINOR_SUGGESTION] : [TESCO_SUGGESTION]
    );
    renderModal();
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Equinor" },
    });
    await screen.findByText("EQUINOR ASA");
    expect(screen.queryByText("TESCO PLC")).toBeNull();

    await selectCountry("United Kingdom", "GB");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Tesco" },
    });
    await screen.findByText("TESCO PLC");
    expect(screen.queryByText("EQUINOR ASA")).toBeNull();
  });

  test("picking a suggestion fills in the company and number, and triggers the lookup automatically", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([EQUINOR_SUGGESTION]);
    vi.mocked(api.registry.lookup).mockResolvedValue(EQUINOR_LOOKUP);
    renderModal();
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Equinor" },
    });
    const suggestion = await screen.findByText("EQUINOR ASA");
    fireEvent.mouseDown(suggestion);

    await waitFor(() => expect(api.registry.lookup).toHaveBeenCalledWith("NO", "923609016"));
    await screen.findByText(/Company found: EQUINOR ASA/);
    expect(screen.getByDisplayValue("923609016")).toBeTruthy();
  });

  test("changing country clears stale suggestions and any previous lookup result", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([EQUINOR_SUGGESTION]);
    vi.mocked(api.registry.lookup).mockResolvedValue(EQUINOR_LOOKUP);
    renderModal();
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Equinor" },
    });
    const suggestion = await screen.findByText("EQUINOR ASA");
    fireEvent.mouseDown(suggestion);
    await screen.findByText(/Company found:/);

    await selectCountry("United Kingdom", "GB");
    expect(screen.queryByText(/Company found:/)).toBeNull();
    expect(screen.queryByText("EQUINOR ASA")).toBeNull();
  });

  test("a provider search error is shown instead of silently appearing as no results", async () => {
    vi.mocked(api.registry.search).mockRejectedValue(
      new Error("Companies House rejected the configured API key (401 Unauthorized).")
    );
    renderModal();
    await selectCountry("United Kingdom", "GB");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Tesco" },
    });
    await screen.findByText(/rejected the configured API key/);
  });

  test("typing, searching, and picking a suggestion never submit the form", async () => {
    vi.mocked(api.registry.search).mockResolvedValue([EQUINOR_SUGGESTION]);
    vi.mocked(api.registry.lookup).mockResolvedValue(EQUINOR_LOOKUP);
    renderModal();
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Equinor" },
    });
    const suggestion = await screen.findByText("EQUINOR ASA");
    fireEvent.mouseDown(suggestion);
    await screen.findByText(/Company found:/);

    expect(api.subcontractors.create).not.toHaveBeenCalled();
  });
});

describe("AddSubcontractorModal category selection", () => {
  async function fillRequiredFieldsExceptCategory() {
    vi.mocked(api.registry.search).mockResolvedValue([]);
    await selectCountry("Norway", "NO");
    fireEvent.change(screen.getByPlaceholderText("e.g. 923609016"), { target: { value: "923609016" } });
    fireEvent.change(screen.getByPlaceholderText("Start typing to search the registry…"), {
      target: { value: "Acme AS" },
    });
    return screen.getByRole("button", { name: "Add subcontractor" }) as HTMLButtonElement;
  }

  test("choosing a predefined category enables submit and saves that exact value", async () => {
    vi.mocked(api.subcontractors.create).mockResolvedValue({ id: "1", company: "Acme AS" } as never);
    renderModal();
    const submitBtn = await fillRequiredFieldsExceptCategory();
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Bunkering" } });
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(api.subcontractors.create).toHaveBeenCalledWith(expect.objectContaining({ category: "Bunkering" }))
    );
  });

  test("Other requires a non-empty custom value before submit is enabled, and never saves the literal 'Other'", async () => {
    vi.mocked(api.subcontractors.create).mockResolvedValue({ id: "1", company: "Acme AS" } as never);
    renderModal();
    const submitBtn = await fillRequiredFieldsExceptCategory();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Other" } });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Custom category"), { target: { value: "  Diving Support  " } });
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(api.subcontractors.create).toHaveBeenCalledWith(expect.objectContaining({ category: "Diving Support" }))
    );
    expect(api.subcontractors.create).not.toHaveBeenCalledWith(expect.objectContaining({ category: "Other" }));
  });
});
