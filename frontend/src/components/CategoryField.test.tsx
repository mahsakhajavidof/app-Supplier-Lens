import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CategoryField, PREDEFINED_CATEGORIES } from "./CategoryField";

afterEach(() => cleanup());

function select() {
  return screen.getByLabelText("Category") as HTMLSelectElement;
}

describe("CategoryField", () => {
  test("lists every predefined category in the required order, plus Other last, after a placeholder", () => {
    render(<CategoryField onChange={vi.fn()} />);
    const options = Array.from(select().options).map((o) => o.value);
    expect(options).toEqual(["", ...PREDEFINED_CATEGORIES, "Other"]);
    expect(select().options[0].textContent).toBe("Select category…");
  });

  test("selecting a predefined category reports that exact value", () => {
    const onChange = vi.fn();
    render(<CategoryField onChange={onChange} />);
    fireEvent.change(select(), { target: { value: "Bunkering" } });
    expect(onChange).toHaveBeenCalledWith("Bunkering");
  });

  test("selecting Other reveals the Custom category input", () => {
    render(<CategoryField onChange={vi.fn()} />);
    expect(screen.queryByLabelText("Custom category")).toBeNull();
    fireEvent.change(select(), { target: { value: "Other" } });
    expect(screen.getByLabelText("Custom category")).toBeTruthy();
  });

  test("selecting Other with no custom text reports an empty value, never the literal 'Other'", () => {
    const onChange = vi.fn();
    render(<CategoryField onChange={onChange} />);
    fireEvent.change(select(), { target: { value: "Other" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(onChange).not.toHaveBeenCalledWith("Other");
  });

  test("typing a custom category trims whitespace before reporting it", () => {
    const onChange = vi.fn();
    render(<CategoryField onChange={onChange} />);
    fireEvent.change(select(), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Custom category"), { target: { value: "  Deep-Sea Diving  " } });
    expect(onChange).toHaveBeenLastCalledWith("Deep-Sea Diving");
    expect(onChange).not.toHaveBeenCalledWith("Other");
  });

  test("a whitespace-only custom category reports an empty value", () => {
    const onChange = vi.fn();
    render(<CategoryField onChange={onChange} />);
    fireEvent.change(select(), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Custom category"), { target: { value: "   " } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  test("switching from Other to a predefined category hides and clears the custom input", () => {
    const onChange = vi.fn();
    render(<CategoryField onChange={onChange} />);
    fireEvent.change(select(), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Custom category"), { target: { value: "Diving Support" } });

    fireEvent.change(select(), { target: { value: "Chartering" } });
    expect(screen.queryByLabelText("Custom category")).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith("Chartering");

    // Selecting Other again should show an empty input, not the old value.
    fireEvent.change(select(), { target: { value: "Other" } });
    expect((screen.getByLabelText("Custom category") as HTMLInputElement).value).toBe("");
  });
});
