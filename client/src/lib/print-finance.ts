import type { FinanceBoletoResponse, FinanceSummaryResponse } from "@shared/routes";
import { formatCurrencyCents, formatDateBR } from "./format";

type FinanceMeta = {
  payer: FinanceSummaryResponse["payer"];
  institution: FinanceSummaryResponse["institution"];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Renderiza um codigo de barras "estilo boleto" (apenas visual) a partir dos digitos.
function renderBarcode(payload: string): string {
  const bars = payload
    .split("")
    .map((char) => {
      const digit = Number(char) || 0;
      const width = 1 + (digit % 4); // 1px..4px
      const gap = 1 + ((digit + 2) % 3); // 1px..3px
      return `<span style="display:inline-block;width:${width}px;height:100%;background:#111;margin-right:${gap}px"></span>`;
    })
    .join("");
  return `<div style="height:48px;display:flex;align-items:stretch;overflow:hidden">${bars}</div>`;
}

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
  .doc { max-width: 720px; margin: 0 auto; }
  .sim-banner { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-align: center; padding: 6px; border-radius: 6px; margin-bottom: 16px; text-transform: uppercase; }
  .slip { border: 1px solid #0f172a; border-radius: 4px; overflow: hidden; }
  .slip + .slip { margin-top: 18px; }
  .row { display: flex; border-bottom: 1px solid #cbd5e1; }
  .row:last-child { border-bottom: none; }
  .cell { padding: 6px 10px; border-right: 1px solid #cbd5e1; flex: 1; }
  .cell:last-child { border-right: none; }
  .cell .k { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .cell .v { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .head { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-bottom: 2px solid #0f172a; }
  .logo { font-weight: 800; font-size: 18px; color: #1d4ed8; border: 2px solid #1d4ed8; border-radius: 6px; padding: 4px 8px; white-space: nowrap; }
  .digitline { font-family: "Courier New", monospace; font-weight: 700; font-size: 15px; letter-spacing: .02em; flex: 1; text-align: right; }
  .title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #334155; }
  .amount { font-size: 18px; font-weight: 800; }
  .values .cell .v { font-size: 14px; }
  .pos { color: #047857; }
  .neg { color: #b91c1c; }
  .instr { padding: 8px 10px; font-size: 11px; color: #475569; line-height: 1.5; }
  .receipt-amount { font-size: 28px; font-weight: 800; color: #047857; }
  @page { size: A4 portrait; margin: 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; } }
`;

function wrapDocument(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title><style>${BASE_STYLES}</style></head>
<body><main class="doc">${body}</main></body></html>`;
}

export function buildBoletoHtml(boleto: FinanceBoletoResponse, meta: FinanceMeta): string {
  const { institution, payer } = meta;
  const net = boleto.baseCents - boleto.discountCents;
  const courseLine = payer.courseName ? ` — ${escapeHtml(payer.courseName)}` : "";

  const multaRow =
    boleto.status === "vencido"
      ? `<div class="cell"><div class="k">(+) Multa por atraso (${formatCurrencyCents(boleto.lateFeePerDayCents)}/dia × ${boleto.daysOverdue} dia(s))</div><div class="v neg">${formatCurrencyCents(boleto.lateFeeCents)}</div></div>`
      : `<div class="cell"><div class="k">(+) Multa por atraso</div><div class="v">${formatCurrencyCents(0)}</div></div>`;

  const body = `
  <div class="sim-banner">Documento simulado — sem valor fiscal — projeto academico</div>
  <div class="slip">
    <div class="head">
      <div class="logo">AS</div>
      <div class="digitline">${escapeHtml(boleto.linhaDigitavel)}</div>
    </div>
    <div class="row">
      <div class="cell" style="flex:3"><div class="k">Beneficiario</div><div class="v">${escapeHtml(institution.beneficiary)}</div></div>
      <div class="cell"><div class="k">CNPJ</div><div class="v">${escapeHtml(institution.cnpj)}</div></div>
    </div>
    <div class="row">
      <div class="cell"><div class="k">Agencia / Codigo</div><div class="v">${escapeHtml(institution.agency)} / ${escapeHtml(institution.account)}</div></div>
      <div class="cell"><div class="k">Nosso numero</div><div class="v">${escapeHtml(boleto.id)}</div></div>
      <div class="cell"><div class="k">Vencimento</div><div class="v">${formatDateBR(boleto.dueDate)}</div></div>
    </div>
    <div class="row">
      <div class="cell" style="flex:3"><div class="k">Pagador</div><div class="v">${escapeHtml(payer.name)} (RA ${escapeHtml(payer.ra)})${courseLine}</div></div>
      <div class="cell"><div class="k">Competencia</div><div class="v">${escapeHtml(boleto.referenceLabel)}</div></div>
    </div>
    <div class="row values">
      <div class="cell"><div class="k">(=) Valor do documento</div><div class="v">${formatCurrencyCents(boleto.baseCents)}</div></div>
      <div class="cell"><div class="k">(−) Desconto / bolsa (${boleto.discountPercent}%)</div><div class="v pos">${formatCurrencyCents(boleto.discountCents)}</div></div>
    </div>
    <div class="row values">
      ${multaRow}
      <div class="cell"><div class="k">(=) Valor cobrado</div><div class="v amount">${formatCurrencyCents(boleto.amountDueCents)}</div></div>
    </div>
    <div class="instr">
      <strong>Instrucoes:</strong> Mensalidade referente a ${escapeHtml(boleto.referenceLabel)} (valor liquido ${formatCurrencyCents(net)} apos a bolsa de ${boleto.discountPercent}%).
      Apos o vencimento, cobrar multa de ${formatCurrencyCents(boleto.lateFeePerDayCents)} por dia de atraso.
      Documento gerado para fins academicos — nao possui valor fiscal nem registro bancario.
    </div>
    ${renderBarcode(boleto.barcodePayload)}
  </div>`;

  return wrapDocument(`Boleto ${boleto.referenceLabel}`, body);
}

export function buildReceiptHtml(boleto: FinanceBoletoResponse, meta: FinanceMeta): string {
  const { institution, payer } = meta;
  const courseLine = payer.courseName ? ` — ${escapeHtml(payer.courseName)}` : "";

  const body = `
  <div class="sim-banner">Documento simulado — sem valor fiscal — projeto academico</div>
  <div class="slip">
    <div class="head">
      <div class="logo">AS</div>
      <div class="digitline" style="text-align:right">RECIBO DE PAGAMENTO</div>
    </div>
    <div class="row">
      <div class="cell" style="flex:3"><div class="k">Recebemos de</div><div class="v">${escapeHtml(payer.name)} (RA ${escapeHtml(payer.ra)})${courseLine}</div></div>
      <div class="cell"><div class="k">Recibo n.</div><div class="v">${escapeHtml(boleto.receiptNumber ?? "—")}</div></div>
    </div>
    <div class="row">
      <div class="cell"><div class="k">Referente a</div><div class="v">Mensalidade ${escapeHtml(boleto.referenceLabel)}</div></div>
      <div class="cell"><div class="k">Data do pagamento</div><div class="v">${formatDateBR(boleto.paidAt)}</div></div>
      <div class="cell"><div class="k">Vencimento</div><div class="v">${formatDateBR(boleto.dueDate)}</div></div>
    </div>
    <div class="row">
      <div class="cell"><div class="k">Valor do documento</div><div class="v">${formatCurrencyCents(boleto.baseCents)}</div></div>
      <div class="cell"><div class="k">Desconto / bolsa (${boleto.discountPercent}%)</div><div class="v pos">− ${formatCurrencyCents(boleto.discountCents)}</div></div>
    </div>
    <div class="row">
      <div class="cell" style="text-align:center; padding:16px"><div class="k">Valor pago</div><div class="receipt-amount">${formatCurrencyCents(boleto.paidAmountCents ?? 0)}</div></div>
    </div>
    <div class="instr">
      Beneficiario: ${escapeHtml(institution.beneficiary)} — CNPJ ${escapeHtml(institution.cnpj)}.
      Autenticacao (simulada): ${escapeHtml(boleto.linhaDigitavel)}.
      Pagamento quitado dentro do prazo, sem incidencia de multa. Documento gerado para fins academicos.
    </div>
  </div>`;

  return wrapDocument(`Recibo ${boleto.referenceLabel}`, body);
}

// Abre o documento em uma nova janela e dispara a impressao (Salvar como PDF).
// Espelha o padrao de printTableDocument em print-table.ts.
export function printHtmlDocument(html: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    throw new Error("Nao foi possivel abrir a janela de impressao.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
