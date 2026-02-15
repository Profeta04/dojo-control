import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("JoinVictus - Utilitários", () => {
  describe("cn (className merge)", () => {
    it("combina classes simples", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("remove classes conflitantes do tailwind", () => {
      const result = cn("p-4", "p-8");
      expect(result).toBe("p-8");
    });

    it("ignora valores falsy", () => {
      expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
    });

    it("suporta condicionais", () => {
      const isActive = true;
      const result = cn("base", isActive && "active");
      expect(result).toContain("active");
    });
  });
});
