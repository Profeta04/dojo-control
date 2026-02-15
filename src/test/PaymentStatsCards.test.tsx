import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    render(<PaymentStatsCards stats={adminStats} formatCurrency={mockFormatCurrency} variant="admin" />);
    
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Atrasados")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Pagos")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("exibe card de comprovantes pendentes quando há comprovantes", () => {
    render(<PaymentStatsCards stats={adminStats} formatCurrency={mockFormatCurrency} variant="admin" />);
    expect(screen.getByText("Comprovantes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("não exibe card de comprovantes quando pendingReceipts é 0", () => {
    const stats = { ...adminStats, pendingReceipts: 0 };
    render(<PaymentStatsCards stats={stats} formatCurrency={mockFormatCurrency} variant="admin" />);
    expect(screen.queryByText("Comprovantes")).not.toBeInTheDocument();
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
    render(<PaymentStatsCards stats={studentStats} formatCurrency={mockFormatCurrency} variant="student" />);
    
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("Comprovantes")).not.toBeInTheDocument();
  });
});
