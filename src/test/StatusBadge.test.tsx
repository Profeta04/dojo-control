import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PaymentStatusBadge, RegistrationStatusBadge } from "@/components/shared/StatusBadge";

describe("JoinVictus - PaymentStatusBadge", () => {
  it("renderiza status 'pendente' com label correto", () => {
    const { getByText } = render(<PaymentStatusBadge status="pendente" />);
    expect(getByText("Pendente")).toBeInTheDocument();
  });

  it("renderiza status 'pago' com label correto", () => {
    const { getByText } = render(<PaymentStatusBadge status="pago" />);
    expect(getByText("Pago")).toBeInTheDocument();
  });

  it("renderiza status 'atrasado' com label correto", () => {
    const { getByText } = render(<PaymentStatusBadge status="atrasado" />);
    expect(getByText("Atrasado")).toBeInTheDocument();
  });

  it("renderiza status desconhecido sem quebrar", () => {
    const { getByText } = render(<PaymentStatusBadge status="desconhecido" />);
    expect(getByText("desconhecido")).toBeInTheDocument();
  });
});

describe("JoinVictus - RegistrationStatusBadge", () => {
  it("renderiza status 'pendente'", () => {
    const { getByText } = render(<RegistrationStatusBadge status="pendente" />);
    expect(getByText("Pendente")).toBeInTheDocument();
  });

  it("renderiza status 'aprovado'", () => {
    const { getByText } = render(<RegistrationStatusBadge status="aprovado" />);
    expect(getByText("Aprovado")).toBeInTheDocument();
  });

  it("renderiza status 'rejeitado'", () => {
    const { getByText } = render(<RegistrationStatusBadge status="rejeitado" />);
    expect(getByText("Rejeitado")).toBeInTheDocument();
  });
});
