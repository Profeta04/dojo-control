import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";

const mockFormatCurrency = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

describe("JoinVictus - PaymentStatsCards (Admin)", () => {
  const adminStats = {
    total: 45,
    pendente: 12,
    atrasado: 5,
    pago: 28,
    totalPendente: 3600,
    pendingReceipts: 3,
  };

  it("renderiza todos os cards de estatísticas do admin", () => {
    const { getByText } = render(<PaymentStatsCards stats={adminStats} formatCurrency={mockFormatCurrency} variant="admin" />);
    
    expect(getByText("Total")).toBeInTheDocument();
    expect(getByText("45")).toBeInTheDocument();
    expect(getByText("Pendentes")).toBeInTheDocument();
    expect(getByText("12")).toBeInTheDocument();
    expect(getByText("Atrasados")).toBeInTheDocument();
    expect(getByText("5")).toBeInTheDocument();
    expect(getByText("Pagos")).toBeInTheDocument();
    expect(getByText("28")).toBeInTheDocument();
  });

  it("exibe card de comprovantes pendentes quando há comprovantes", () => {
    const { getByText } = render(<PaymentStatsCards stats={adminStats} formatCurrency={mockFormatCurrency} variant="admin" />);
    expect(getByText("Comprovantes")).toBeInTheDocument();
    expect(getByText("3")).toBeInTheDocument();
  });

  it("não exibe card de comprovantes quando pendingReceipts é 0", () => {
    const stats = { ...adminStats, pendingReceipts: 0 };
    const { queryByText } = render(<PaymentStatsCards stats={stats} formatCurrency={mockFormatCurrency} variant="admin" />);
    expect(queryByText("Comprovantes")).not.toBeInTheDocument();
  });
});

describe("JoinVictus - PaymentStatsCards (Student)", () => {
  const studentStats = {
    total: 6,
    pendente: 2,
    atrasado: 1,
    pago: 3,
    totalPendente: 450,
  };

  it("renderiza cards sem card de comprovantes na visão do aluno", () => {
    const { getByText, queryByText } = render(<PaymentStatsCards stats={studentStats} formatCurrency={mockFormatCurrency} variant="student" />);
    
    expect(getByText("Total")).toBeInTheDocument();
    expect(getByText("6")).toBeInTheDocument();
    expect(queryByText("Comprovantes")).not.toBeInTheDocument();
  });
});
