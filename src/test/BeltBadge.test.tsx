import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BeltBadge } from "@/components/shared/BeltBadge";

describe("JoinVictus - BeltBadge Component", () => {
  const belts = [
    { grade: "branca", label: "Faixa Branca", color: "#FFFFFF" },
    { grade: "cinza", label: "Faixa Cinza", color: "#999999" },
    { grade: "azul", label: "Faixa Azul", color: "#1A73E8" },
    { grade: "amarela", label: "Faixa Amarela", color: "#FFD600" },
    { grade: "laranja", label: "Faixa Laranja", color: "#FF6D00" },
    { grade: "verde", label: "Faixa Verde", color: "#2E7D32" },
    { grade: "roxa", label: "Faixa Roxa", color: "#7B1FA2" },
    { grade: "marrom", label: "Faixa Marrom", color: "#5D4037" },
    { grade: "preta_1dan", label: "Faixa Preta 1º Dan", color: "#1A1A1A" },
  ];

  it.each(belts)("renderiza faixa $grade com a cor correta", ({ grade, color }) => {
    const { container } = render(<BeltBadge grade={grade} />);
    const badge = container.querySelector("[style]");
    expect(badge).toBeTruthy();
    expect(badge?.getAttribute("style")).toContain(color);
  });

  it.each(belts)("exibe label para faixa $grade quando showLabel=true", ({ grade, label }) => {
    render(<BeltBadge grade={grade} showLabel />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renderiza em tamanhos diferentes (sm, md, lg)", () => {
    const { rerender, container } = render(<BeltBadge grade="cinza" size="sm" />);
    expect(container.querySelector(".h-3")).toBeTruthy();

    rerender(<BeltBadge grade="cinza" size="md" />);
    expect(container.querySelector(".h-4")).toBeTruthy();

    rerender(<BeltBadge grade="cinza" size="lg" />);
    expect(container.querySelector(".h-5")).toBeTruthy();
  });

  it("faixa branca tem borda visível", () => {
    const { container } = render(<BeltBadge grade="branca" />);
    const badge = container.querySelector("[style]");
    expect(badge?.className).toContain("border");
  });
});
