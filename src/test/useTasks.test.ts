import { describe, it, expect } from "vitest";
import { CATEGORY_CONFIG, type TaskCategory, type TaskStatus, type TaskPriority } from "@/hooks/useTasks";

describe("JoinVictus - Sistema de Tarefas (Tipos e Configuração)", () => {
  describe("Categorias de Tarefas", () => {
    const expectedCategories: TaskCategory[] = ["tecnica", "fisica", "administrativa", "outra"];

    it("contém todas as 4 categorias", () => {
      expect(Object.keys(CATEGORY_CONFIG)).toHaveLength(4);
    });

    it.each(expectedCategories)("categoria '%s' tem label, color e bgColor", (cat) => {
      const config = CATEGORY_CONFIG[cat];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(config.bgColor).toBeTruthy();
    });

    it("labels estão em português", () => {
      expect(CATEGORY_CONFIG.tecnica.label).toBe("Técnica");
      expect(CATEGORY_CONFIG.fisica.label).toBe("Física");
      expect(CATEGORY_CONFIG.administrativa.label).toBe("Administrativa");
      expect(CATEGORY_CONFIG.outra.label).toBe("Outra");
    });
  });

  describe("Tipos de Status de Tarefa", () => {
    it("status válidos incluem pendente, concluida, cancelada", () => {
      const validStatuses: TaskStatus[] = ["pendente", "concluida", "cancelada"];
      validStatuses.forEach(status => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("Tipos de Prioridade de Tarefa", () => {
    it("prioridades válidas incluem baixa, normal, alta", () => {
      const validPriorities: TaskPriority[] = ["baixa", "normal", "alta"];
      validPriorities.forEach(priority => {
        expect(typeof priority).toBe("string");
      });
    });
  });
});
