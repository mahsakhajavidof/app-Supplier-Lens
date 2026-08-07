import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RiskAssessment } from "./RiskAssessment";
import { ToastProvider } from "../../lib/toast";
import { api } from "../../lib/api";
import type { RiskAssessment as RiskAssessmentData, Subcontractor } from "../../types";

vi.mock("../../lib/api", () => ({
  api: {
    settings: { team: vi.fn() },
    riskAssessment: { get: vi.fn(), brief: vi.fn(), decide: vi.fn(), convertToTask: vi.fn() },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function sub(overrides: Partial<Subcontractor> = {}): Subcontractor {
  return {
    id: "sub-1",
    company: "Test Co",
    orgNr: "923609016",
    country: "NO",
    category: "Bunkering",
    companyStatus: "Registered and active",
    vatRegistered: true,
    lastCheckedAt: "2026-08-07T00:00:00.000Z",
    active: true,
    events: [],
    latestChange: "No changes detected",
    attention: "New information",
    status: "No action needed",
    newEventsCount: 0,
    ...overrides,
  };
}

function assessment(overrides: Partial<RiskAssessmentData> = {}): RiskAssessmentData {
  return {
    metrics: [{ key: "revenue_growth", label: "Revenue growth", value: 12.3, unit: "percent", calculable: true, periodLabel: "FY2025 vs FY2024", calculatedBySupplierLens: true }],
    indicators: [
      {
        key: "liquidity_ratio",
        title: "Liquidity",
        status: "Attention",
        observedValue: "1.00",
        comparisonPeriod: "FY2025",
        whyItMatters: "A low liquidity ratio can signal difficulty meeting short-term obligations.",
        source: "Annual accounts / registry, as reported",
        retrievedAt: "2026-08-07T00:00:00.000Z",
        ruleUsed: "Attention below 1.2, High attention below 0.8.",
        isInformationGap: false,
      },
    ],
    guidance: [{ key: "guidance_liquidity_ratio", category: "Liquidity", guidance: "Consider discussing payment terms.", evidenceSummary: "Liquidity: 1.00 (FY2025).", basedOnIndicatorKey: "liquidity_ratio" }],
    decisions: [],
    ...overrides,
  };
}

function renderTab(data: RiskAssessmentData) {
  vi.mocked(api.settings.team).mockResolvedValue([]);
  vi.mocked(api.riskAssessment.get).mockResolvedValue(data);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RiskAssessment sub={sub()} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("RiskAssessment tab", () => {
  test("shows calculated metrics clearly labeled as calculated by Supplier Lens", async () => {
    renderTab(assessment());
    await screen.findByText("Calculated financial metrics");
    expect(screen.getByText("Calculated by Supplier Lens from reported figures")).toBeTruthy();
    expect(screen.getByText("12.3%")).toBeTruthy();
  });

  test("shows a 'Not calculable' metric with its reason instead of a misleading number", async () => {
    renderTab(assessment({ metrics: [{ key: "revenue_growth", label: "Revenue growth", value: null, unit: "percent", calculable: false, reason: "Fewer than two reported financial periods available.", periodLabel: "—", calculatedBySupplierLens: true }] }));
    await screen.findByText("Not calculable");
    expect(screen.getByText("Fewer than two reported financial periods available.")).toBeTruthy();
  });

  test("renders a risk indicator with its status, evidence, and rule used — never presented as an official rating", async () => {
    renderTab(assessment());
    await screen.findByText("A low liquidity ratio can signal difficulty meeting short-term obligations.");
    expect(screen.getByText(/Not an official rating/)).toBeTruthy();
    expect(screen.getByText(/Attention below 1.2/)).toBeTruthy();
  });

  test("renders negotiation guidance tied to its evidence", async () => {
    renderTab(assessment());
    await screen.findByText("Consider discussing payment terms.");
    expect(screen.getByText(/Evidence: Liquidity: 1.00/)).toBeTruthy();
  });

  test("dismissing an Attention indicator as not relevant without a note is blocked client-side", async () => {
    renderTab(assessment());
    await screen.findByText("A low liquidity ratio can signal difficulty meeting short-term obligations.");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "NOT_RELEVANT" } });
    fireEvent.click(screen.getByText("Save decision"));
    await waitFor(() => expect(api.riskAssessment.decide).not.toHaveBeenCalled());
  });

  test("accepting an indicator saves the decision without requiring a note", async () => {
    vi.mocked(api.riskAssessment.decide).mockResolvedValue({} as never);
    renderTab(assessment());
    await screen.findByText("A low liquidity ratio can signal difficulty meeting short-term obligations.");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ACCEPTED" } });
    fireEvent.click(screen.getByText("Save decision"));
    await waitFor(() => expect(api.riskAssessment.decide).toHaveBeenCalledWith("sub-1", "liquidity_ratio", expect.objectContaining({ status: "ACCEPTED" })));
  });

  test("converting an indicator to a task calls the API with the indicator key", async () => {
    vi.mocked(api.riskAssessment.convertToTask).mockResolvedValue({} as never);
    renderTab(assessment());
    await screen.findByText("A low liquidity ratio can signal difficulty meeting short-term obligations.");
    fireEvent.click(screen.getByText("Convert to task"));
    await waitFor(() => expect(api.riskAssessment.convertToTask).toHaveBeenCalledWith("sub-1", "liquidity_ratio", {}));
  });

  test("generating the negotiation brief fetches and displays the deterministic document", async () => {
    vi.mocked(api.riskAssessment.brief).mockResolvedValue({ brief: "# Negotiation & due-diligence brief\n\nTest Co evidence here." });
    renderTab(assessment());
    await screen.findByText("A low liquidity ratio can signal difficulty meeting short-term obligations.");
    fireEvent.click(screen.getByText("Generate negotiation brief"));
    await screen.findByText(/Test Co evidence here/);
  });
});
