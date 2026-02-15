import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge, RegistrationStatusBadge } from "@/components/shared/StatusBadge";

describe("JoinVictus - PaymentStatusBadge", () => {
  it("renderiza status 'pendente' com label correto", () => {
    render(<PaymentStatusBadge status="pendente" />);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("renderiza status 'pago' com label correto", () => {
    render(<PaymentStatusBadge status="pago" />);
    expect(screen.getByText("Pago")).toBeInTheDocument();
  });

  it("renderiza status 'atrasado' com label correto", () => {
    render(<PaymentStatusBadge status="atrasado" />);
    expect(screen.getByText("Atrasado")).toBeInTheDocument();
  });

  it("renderiza status desconhecido sem quebrar", () => {
    render(<PaymentStatusBadge status="desconhecido" />);
    expect(screen.getByText("desconhecido")).toBeInTheDocument();
  });
});

describe("JoinVictus - RegistrationStatusBadge", () => {
  it("renderiza status 'pendente'", () => {
    render(<RegistrationStatusBadge status="pendente" />);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("renderiza status 'aprovado'", () => {
    render(<RegistrationStatusBadge status="aprovado" />);
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
  });

  it("renderiza status 'rejeitado'", () => {
    render(<RegistrationStatusBadge status="rejeitado" />);
    expect(screen.getByText("Rejeitado")).toBeInTheDocument();
  });
});
