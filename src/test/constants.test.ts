import { describe, it, expect } from "vitest";
import {
  BELT_LABELS,
  BELT_COLORS,
  ROLE_LABELS,
  PAYMENT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  PAYMENT_CATEGORY_LABELS,
} from "@/lib/constants";

describe("JoinVictus - Constantes do Sistema", () => {
  describe("Faixas (BELT_LABELS)", () => {
    it("contém todas as 30 faixas", () => {
      expect(Object.keys(BELT_LABELS)).toHaveLength(30);
    });

    it("faixas iniciais estão presentes (branca, cinza, azul, amarela, laranja, verde)", () => {
      expect(BELT_LABELS.branca).toBe("Faixa Branca");
      expect(BELT_LABELS.cinza).toBe("Faixa Cinza");
      expect(BELT_LABELS.azul).toBe("Faixa Azul");
      expect(BELT_LABELS.amarela).toBe("Faixa Amarela");
      expect(BELT_LABELS.laranja).toBe("Faixa Laranja");
      expect(BELT_LABELS.verde).toBe("Faixa Verde");
    });

    it("faixas avançadas estão presentes (roxa, marrom, pretas)", () => {
      expect(BELT_LABELS.roxa).toBe("Faixa Roxa");
      expect(BELT_LABELS.marrom).toBe("Faixa Marrom");
      expect(BELT_LABELS.preta_1dan).toBe("Faixa Preta 1º Dan");
      expect(BELT_LABELS.preta_10dan).toBe("Faixa Preta 10º Dan");
    });
  });

  describe("Cores das Faixas (BELT_COLORS)", () => {
    it("cada faixa tem uma classe CSS de cor", () => {
      Object.values(BELT_COLORS).forEach(color => {
        expect(color).toBeTruthy();
        expect(typeof color).toBe("string");
      });
    });
  });

  describe("Roles (ROLE_LABELS)", () => {
    it("contém todas as 5 roles", () => {
      expect(Object.keys(ROLE_LABELS)).toHaveLength(5);
    });

    it("labels estão corretos", () => {
      expect(ROLE_LABELS.student).toBe("Aluno");
      expect(ROLE_LABELS.sensei).toBe("Sensei");
      expect(ROLE_LABELS.admin).toBe("Administrador");
      expect(ROLE_LABELS.dono).toBe("Sensei");
    });
  });

  describe("Status de Pagamento", () => {
    it("contém 3 status", () => {
      expect(Object.keys(PAYMENT_STATUS_LABELS)).toHaveLength(3);
      expect(PAYMENT_STATUS_LABELS.pendente).toBe("Pendente");
      expect(PAYMENT_STATUS_LABELS.pago).toBe("Pago");
      expect(PAYMENT_STATUS_LABELS.atrasado).toBe("Atrasado");
    });
  });

  describe("Status de Registro", () => {
    it("contém 3 status", () => {
      expect(Object.keys(REGISTRATION_STATUS_LABELS)).toHaveLength(3);
      expect(REGISTRATION_STATUS_LABELS.pendente).toBe("Pendente");
      expect(REGISTRATION_STATUS_LABELS.aprovado).toBe("Aprovado");
      expect(REGISTRATION_STATUS_LABELS.rejeitado).toBe("Rejeitado");
    });
  });

  describe("Status de Comprovante", () => {
    it("contém 3 status", () => {
      expect(Object.keys(RECEIPT_STATUS_LABELS)).toHaveLength(3);
      expect(RECEIPT_STATUS_LABELS.pendente_verificacao).toBe("Em Verificação");
      expect(RECEIPT_STATUS_LABELS.aprovado).toBe("Aprovado");
      expect(RECEIPT_STATUS_LABELS.rejeitado).toBe("Rejeitado");
    });
  });

  describe("Categorias de Pagamento", () => {
    it("contém 6 categorias", () => {
      expect(Object.keys(PAYMENT_CATEGORY_LABELS)).toHaveLength(6);
      expect(PAYMENT_CATEGORY_LABELS.mensalidade).toBe("Mensalidade");
      expect(PAYMENT_CATEGORY_LABELS.material).toBe("Material / Kimono");
      expect(PAYMENT_CATEGORY_LABELS.taxa_exame).toBe("Taxa de Exame");
      expect(PAYMENT_CATEGORY_LABELS.evento).toBe("Evento");
      expect(PAYMENT_CATEGORY_LABELS.matricula).toBe("Matrícula");
      expect(PAYMENT_CATEGORY_LABELS.outro).toBe("Outro");
    });
  });
});
