import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

const studentFAQ: FAQItem[] = [
  { question: "Como faço check-in no treino?", answer: "Peça ao sensei o QR Code do dojo. Escaneie com a câmera do celular ou use o leitor na aba de check-in. Sua presença será registrada automaticamente." },
  { question: "Como envio meu comprovante de pagamento?", answer: "Acesse 'Pagamentos', encontre a mensalidade pendente e clique no botão de upload. Envie uma foto ou print do comprovante. O sensei irá aprovar." },
  { question: "Como ganho XP?", answer: "Você ganha XP completando tarefas, fazendo check-in nos treinos e desbloqueando conquistas. Quanto mais ativo, mais XP você acumula!" },
  { question: "Posso ver meu histórico de graduações?", answer: "Sim! Acesse 'Meu Progresso' para ver toda a sua linha do tempo de faixas." },
  { question: "O que acontece se meu pagamento atrasar?", answer: "O sistema marca o pagamento como atrasado. Dependendo da configuração do dojo, pode haver restrições até a regularização." },
];

const senseiFAQ: FAQItem[] = [
  { question: "Como aprovo um novo aluno?", answer: "Acesse 'Alunos' e veja a aba 'Pendentes'. Clique em aprovar, defina a faixa inicial e adicione o aluno a uma turma." },
  { question: "Como gero cobranças mensais?", answer: "Em 'Pagamentos', use o botão de gerar cobranças mensais. O sistema cria automaticamente os pagamentos com base nos planos configurados." },
  { question: "Como personalizo as cores do dojo?", answer: "Acesse 'Config. Dojo' e edite as cores primária, secundária e de destaque. As mudanças refletem em todo o sistema." },
  { question: "Como funciona o QR Code de check-in?", answer: "Cada dojo tem um QR Code único. Imprima ou exiba no local do treino. Os alunos escaneiam para registrar presença automaticamente." },
  { question: "Como exporto relatórios?", answer: "No Dashboard, clique no botão 'Exportar Relatório'. Você pode gerar relatórios gerais e financeiros em PDF." },
  { question: "Como adiciono um sensei ao dojo?", answer: "Apenas administradores podem gerenciar senseis. Acesse a aba 'Senseis' para adicionar ou remover." },
];

export function HelpFAQ() {
  const { canManageStudents } = useAuth();
  const faqItems = canManageStudents ? senseiFAQ : studentFAQ;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Perguntas frequentes sobre o uso do sistema.
      </p>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {faqItems.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border/60 rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-3 text-left text-sm font-medium">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
