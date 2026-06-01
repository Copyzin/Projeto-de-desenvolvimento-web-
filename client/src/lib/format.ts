// Formatadores compartilhados (moeda BRL e datas), centralizados para a area financeira.

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Recebe valores em centavos (inteiros) e formata como R$ 1.234,56.
export function formatCurrencyCents(cents: number): string {
  return BRL.format((cents ?? 0) / 100);
}

// Converte uma data ISO (YYYY-MM-DD) para DD/MM/YYYY sem sofrer com fuso horario.
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [datePart] = iso.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
