import { describe, it, expect } from "vitest";
import { levenshteinDistance, findBestMatch, findAllMatches } from "@/lib/fuzzyMatch";

describe("JoinVictus - Busca Fuzzy (levenshteinDistance)", () => {
  it("distância 0 para strings idênticas", () => {
    expect(levenshteinDistance("judô", "judô")).toBe(0);
  });

  it("calcula distância corretamente", () => {
    expect(levenshteinDistance("carlos", "marcos")).toBeGreaterThan(0);
    expect(levenshteinDistance("carlos", "marcos")).toBeLessThanOrEqual(6);
  });
});

describe("JoinVictus - Busca Fuzzy (findBestMatch)", () => {
  const options = [
    { id: "1", name: "Carlos Silva" },
    { id: "2", name: "Ana Santos" },
    { id: "3", name: "João Pedro" },
  ];

  it("encontra correspondência exata", () => {
    const result = findBestMatch("Carlos Silva", options);
    expect(result).toBeTruthy();
    expect(result!.id).toBe("1");
    expect(result!.score).toBe(1);
  });

  it("encontra correspondência parcial (contains)", () => {
    const result = findBestMatch("Santos", options);
    expect(result).toBeTruthy();
    expect(result!.id).toBe("2");
  });

  it("retorna null para input vazio", () => {
    expect(findBestMatch("", options)).toBeNull();
  });

  it("retorna null para lista vazia", () => {
    expect(findBestMatch("carlos", [])).toBeNull();
  });
});

describe("JoinVictus - Busca Fuzzy (findAllMatches)", () => {
  const options = [
    { id: "1", name: "Turma Infantil A" },
    { id: "2", name: "Turma Infantil B" },
    { id: "3", name: "Turma Adulto" },
  ];

  it("retorna múltiplos resultados para busca ampla", () => {
    const results = findAllMatches("Turma", options);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("retorna vazio para input vazio", () => {
    expect(findAllMatches("", options)).toHaveLength(0);
  });
});
