// Gerador financeiro SIMULADO (projeto academico). Sem acesso a banco e sem tabelas:
// produz boletos/mensalidades deterministicos por aluno, com desconto (bolsa) e
// multa por atraso de R$ 2,00/dia calculada ao vivo com a data informada.
// A estrutura (precos, descontos, multa, status, recibo, linha digitavel) e real;
// apenas os dados sao mockados.

export const LATE_FEE_CENTS_PER_DAY = 200; // R$ 2,00 por dia de atraso

// Beneficiario simulado (instituicao). Dados ficticios — documento sem valor fiscal.
export const FINANCE_INSTITUTION = {
  name: "Academic Suite — Instituicao de Ensino",
  cnpj: "12.345.678/0001-90",
  beneficiary: "Academic Suite Educacional LTDA",
  agency: "0001",
  account: "12345-6",
};

export type FinanceBoletoStatus = "aberto" | "pago" | "vencido";

export type FinanceBoleto = {
  id: string;
  competence: string; // "2026-05"
  referenceLabel: string; // "Maio/2026"
  description: string;
  dueDate: string; // ISO date (YYYY-MM-DD)
  baseCents: number; // valor do documento
  discountPercent: number; // % da bolsa aplicada
  discountCents: number;
  status: FinanceBoletoStatus;
  paidAt: string | null; // ISO date quando pago
  paidAmountCents: number | null;
  lateFeePerDayCents: number;
  daysOverdue: number;
  lateFeeCents: number; // multa acumulada
  amountDueCents: number; // valor a cobrar (base - desconto + multa)
  receiptNumber: string | null;
  linhaDigitavel: string;
  barcodePayload: string;
};

export type FinanceSummaryTotals = {
  emAbertoCents: number;
  vencidoCents: number;
  multaCents: number;
  pagoCents: number;
  proximoVencimento: string | null;
  situacao: "em_dia" | "inadimplente";
};

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DAY_MS = 86_400_000;
const MONTH_OFFSETS = [-3, -2, -1, 0, 1, 2];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

// PRNG deterministico (LCG) para gerar digitos estaveis de linha digitavel/codigo de barras.
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seededDigits(seed: number, length: number) {
  const rng = makeRng(seed);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(rng() * 10);
  }
  return out;
}

function formatLinhaDigitavel(digits: string) {
  // Mascara padrao de linha digitavel (47 posicoes): 5.5 5.6 5.6 1 14
  const d = digits.padEnd(47, "0").slice(0, 47);
  return (
    `${d.slice(0, 5)}.${d.slice(5, 10)} ` +
    `${d.slice(10, 15)}.${d.slice(15, 21)} ` +
    `${d.slice(21, 26)}.${d.slice(26, 32)} ` +
    `${d.slice(32, 33)} ` +
    `${d.slice(33, 47)}`
  );
}

function courseBaseCents(courseName: string | undefined) {
  const name = (courseName ?? "").toLowerCase();
  if (name.includes("engenharia")) return 92_000; // R$ 920,00
  if (name.includes("sistemas")) return 79_000; // R$ 790,00
  return 85_000; // R$ 850,00 (Ciencia da Computacao / default — alinhado ao dashboard)
}

// Bolsa/desconto sempre > 0, para o desconto sempre aparecer ao aluno.
function discountPercentFor(studentId: number) {
  return [10, 15, 20, 25][studentId % 4];
}

// Quantidade de mensalidades vencidas (em atraso) por aluno — varia a situacao no painel admin.
// id % 4 === 1 => 0 atrasos (em dia); demais => 1 ou 2 atrasos (inadimplente).
function overdueCountFor(studentId: number) {
  return [1, 0, 1, 2][studentId % 4];
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function generateBoletos(params: {
  studentId: number;
  courseName?: string;
  today: Date;
}): FinanceBoleto[] {
  const { studentId, courseName, today } = params;
  const todayMid = startOfDay(today);
  const baseCents = courseBaseCents(courseName);
  const discountPercent = discountPercentFor(studentId);
  const discountCents = Math.round((baseCents * discountPercent) / 100);
  const netCents = baseCents - discountCents;
  const overdueCount = overdueCountFor(studentId);
  const description = `Mensalidade — ${courseName ?? "Curso"}`;

  // Monta a base de cada mensalidade (vencimento no dia 10 de cada mes).
  const raw = MONTH_OFFSETS.map((offset) => {
    const ref = new Date(today.getFullYear(), today.getMonth() + offset, 10);
    const year = ref.getFullYear();
    const monthIndex = ref.getMonth();
    const dueMid = startOfDay(ref);
    return { year, monthIndex, dueMid, isFuture: dueMid > todayMid };
  });

  // Entre os ja vencidos (due <= hoje), os "overdueCount" mais recentes ficam VENCIDOS; o resto, PAGOS.
  const pastDueSortedDesc = raw
    .filter((item) => !item.isFuture)
    .sort((a, b) => b.dueMid - a.dueMid);
  const overdueSet = new Set(pastDueSortedDesc.slice(0, overdueCount).map((item) => item.dueMid));

  return raw.map((item) => {
    const { year, monthIndex, dueMid, isFuture } = item;
    const competence = `${year}-${pad2(monthIndex + 1)}`;
    const seed = studentId * 100000 + year * 100 + (monthIndex + 1);
    const linhaDigitavel = formatLinhaDigitavel(seededDigits(seed, 47));
    const barcodePayload = seededDigits(seed + 7, 44);
    const dueDate = isoDate(year, monthIndex, 10);

    const common = {
      id: `${studentId}-${year}${pad2(monthIndex + 1)}`,
      competence,
      referenceLabel: `${MONTH_LABELS[monthIndex]}/${year}`,
      description,
      dueDate,
      baseCents,
      discountPercent,
      discountCents,
      lateFeePerDayCents: LATE_FEE_CENTS_PER_DAY,
      linhaDigitavel,
      barcodePayload,
    };

    if (isFuture) {
      return {
        ...common,
        status: "aberto" as const,
        paidAt: null,
        paidAmountCents: null,
        daysOverdue: 0,
        lateFeeCents: 0,
        amountDueCents: netCents,
        receiptNumber: null,
      };
    }

    if (overdueSet.has(dueMid)) {
      const daysOverdue = Math.max(0, Math.floor((todayMid - dueMid) / DAY_MS));
      const lateFeeCents = daysOverdue * LATE_FEE_CENTS_PER_DAY;
      return {
        ...common,
        status: "vencido" as const,
        paidAt: null,
        paidAmountCents: null,
        daysOverdue,
        lateFeeCents,
        amountDueCents: netCents + lateFeeCents,
        receiptNumber: null,
      };
    }

    // Pago: quitado 2 dias antes do vencimento, com desconto e sem multa.
    return {
      ...common,
      status: "pago" as const,
      paidAt: isoDate(year, monthIndex, 8),
      paidAmountCents: netCents,
      daysOverdue: 0,
      lateFeeCents: 0,
      amountDueCents: netCents,
      receiptNumber: `RC${year}${pad2(monthIndex + 1)}${String(studentId).padStart(5, "0")}`,
    };
  });
}

export function summarizeBoletos(boletos: FinanceBoleto[]): FinanceSummaryTotals {
  let emAbertoCents = 0;
  let vencidoCents = 0;
  let multaCents = 0;
  let pagoCents = 0;
  let proximoVencimento: string | null = null;

  for (const boleto of boletos) {
    if (boleto.status === "aberto") {
      emAbertoCents += boleto.amountDueCents;
      if (!proximoVencimento || boleto.dueDate < proximoVencimento) {
        proximoVencimento = boleto.dueDate;
      }
    } else if (boleto.status === "vencido") {
      vencidoCents += boleto.amountDueCents;
      multaCents += boleto.lateFeeCents;
    } else if (boleto.status === "pago") {
      pagoCents += boleto.paidAmountCents ?? 0;
    }
  }

  const situacao = vencidoCents > 0 ? "inadimplente" : "em_dia";
  return { emAbertoCents, vencidoCents, multaCents, pagoCents, proximoVencimento, situacao };
}
