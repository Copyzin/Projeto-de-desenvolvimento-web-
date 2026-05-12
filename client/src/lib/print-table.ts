export type PrintTableColor = {
  accent: string;
  background: string;
};

export type PrintTableCell = {
  title?: string;
  subtitle?: string;
  meta?: string;
  color?: PrintTableColor;
};

export type PrintTableRow = {
  header: string;
  kind?: "data" | "interval";
  intervalLabel?: string;
  cells?: PrintTableCell[];
};

export type PrintTableLegendItem = {
  label: string;
  description?: string;
  meta?: string;
  color: PrintTableColor;
};

export type PrintTableDocument = {
  title: string;
  subtitle?: string;
  details?: string[];
  columns: string[];
  rows: PrintTableRow[];
  legend?: PrintTableLegendItem[];
};

const PRINT_TABLE_COLORS: PrintTableColor[] = [
  { accent: "#005AB5", background: "#D8ECFF" },
  { accent: "#DC3220", background: "#FFE2DD" },
  { accent: "#009E73", background: "#DDF7EE" },
  { accent: "#7B2CBF", background: "#ECDDFF" },
  { accent: "#E69F00", background: "#FFECC2" },
  { accent: "#0072B2", background: "#D6F1FF" },
  { accent: "#CC79A7", background: "#FFE1F0" },
  { accent: "#D55E00", background: "#FFE3CF" },
  { accent: "#00A6A6", background: "#D5FFFF" },
  { accent: "#6A4C93", background: "#E9E1FF" },
  { accent: "#B58900", background: "#FFF2B8" },
  { accent: "#2F7D32", background: "#DFF3E1" },
];

export function getPrintTableColor(index: number) {
  return PRINT_TABLE_COLORS[index % PRINT_TABLE_COLORS.length];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLegendItem(item: PrintTableLegendItem) {
  return `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${item.color.background}; border-color:${item.color.accent};"></span>
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
        ${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}
      </span>
    </div>
  `;
}

function renderCell(cell?: PrintTableCell) {
  if (!cell?.title && !cell?.subtitle && !cell?.meta) {
    return `<td class="empty-cell">Sem aula</td>`;
  }

  const style = cell.color
    ? `style="background:${cell.color.background}; border-left-color:${cell.color.accent};"`
    : "";

  return `
    <td>
      <div class="lesson-cell" ${style}>
        ${cell.title ? `<strong>${escapeHtml(cell.title)}</strong>` : ""}
        ${cell.subtitle ? `<strong>${escapeHtml(cell.subtitle)}</strong>` : ""}
        ${cell.meta ? `<span>${escapeHtml(cell.meta)}</span>` : ""}
      </div>
    </td>
  `;
}

function renderRow(row: PrintTableRow, columnsLength: number) {
  if (row.kind === "interval") {
    return `
      <tr>
        <th class="time-cell">${escapeHtml(row.header)}</th>
        <td class="interval-cell" colspan="${columnsLength}">${escapeHtml(row.intervalLabel ?? "Intervalo")}</td>
      </tr>
    `;
  }

  return `
    <tr>
      <th class="time-cell">${escapeHtml(row.header)}</th>
      ${(row.cells ?? []).map(renderCell).join("")}
    </tr>
  `;
}

export function buildPrintTableHtml(document: PrintTableDocument) {
  const legend = document.legend ?? [];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
    }
    .page { width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 10px;
      border-bottom: 2px solid #111827;
      padding-bottom: 8px;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      line-height: 1.15;
    }
    .subtitle {
      margin-top: 4px;
      color: #374151;
      font-size: 11px;
    }
    .details {
      min-width: 190px;
      text-align: right;
      color: #374151;
      font-size: 10px;
      line-height: 1.35;
    }
    .layout {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .legend {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }
    .legend-title {
      margin: 0 0 2px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #374151;
      font-weight: 700;
    }
    .legend-item {
      display: grid;
      grid-template-columns: 14px 1fr;
      gap: 5px;
      padding: 5px;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      break-inside: avoid;
      font-size: 8px;
      line-height: 1.2;
    }
    .legend-item strong,
    .legend-item small {
      display: block;
    }
    .legend-item small {
      margin-top: 2px;
      color: #374151;
    }
    .legend-swatch {
      width: 14px;
      height: 14px;
      border-left: 6px solid;
      border-radius: 3px;
      align-self: start;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1px solid #111827;
    }
    th,
    td {
      border: 1px solid #9ca3af;
      padding: 4px;
      vertical-align: stretch;
    }
    thead th {
      background: #f3f4f6;
      font-size: 10px;
      text-align: center;
    }
    .time-cell {
      width: 78px;
      background: #f9fafb;
      color: #374151;
      font-size: 9px;
      line-height: 1.2;
      text-align: center;
    }
    .lesson-cell {
      min-height: 54px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      border-left: 8px solid #6b7280;
      border-radius: 5px;
      padding: 5px 6px;
      color: #111827;
      line-height: 1.15;
    }
    .lesson-cell strong {
      display: block;
      font-size: 9px;
    }
    .lesson-cell span {
      display: block;
      font-size: 8px;
      color: #374151;
    }
    .empty-cell {
      height: 58px;
      color: #9ca3af;
      text-align: center;
      font-size: 9px;
    }
    .interval-cell {
      background: #e5e7eb;
      color: #374151;
      text-align: center;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <h1>${escapeHtml(document.title)}</h1>
        ${document.subtitle ? `<div class="subtitle">${escapeHtml(document.subtitle)}</div>` : ""}
      </div>
      <div class="details">
        ${(document.details ?? []).map((detail) => `<div>${escapeHtml(detail)}</div>`).join("")}
      </div>
    </header>
    <section class="layout">
      <table>
        <thead>
          <tr>
            <th class="time-cell">Horario</th>
            ${document.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${document.rows.map((row) => renderRow(row, document.columns.length)).join("")}
        </tbody>
      </table>
      ${
        legend.length
          ? `<aside>
              <p class="legend-title">Legenda</p>
              <div class="legend">${legend.map(renderLegendItem).join("")}</div>
            </aside>`
          : ""
      }
    </section>
  </main>
</body>
</html>`;
}

export function printTableDocument(document: PrintTableDocument) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    throw new Error("Nao foi possivel abrir a janela de impressao.");
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintTableHtml(document));
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
