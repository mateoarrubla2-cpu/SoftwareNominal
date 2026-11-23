import {
  calculateSocialBenefitsForEmployee,
  formatCOP,
  formatShortDate,
  maskBankAccount,
} from './payrollEngine.ts';
import type {
  Employee,
  LegislationParams,
  PayrollDatabase,
  PayrollPeriod,
} from '../types/payroll.ts';
import type { DriveFile } from './googleDrive.ts';

export interface GoogleDocContent {
  documentId: string;
  title: string;
  bodyText: string;
  endIndex: number;
  webViewLink: string;
}

async function docsFetch(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      payload.error?.message ?? `Error de Google Docs (${res.status})`,
    );
  }
  return res;
}

export async function listGoogleDocs(accessToken: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: "mimeType = 'application/vnd.google-apps.document' and trashed = false",
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '25',
  });
  const res = await docsFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken,
  );
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files ?? [];
}

interface RawDocElement {
  endIndex?: number;
  paragraph?: {
    elements?: Array<{ textRun?: { content?: string } }>;
  };
  table?: {
    tableRows?: Array<{
      tableCells?: Array<{
        content?: RawDocElement[];
      }>;
    }>;
  };
}

function extractTextFromElements(elements: RawDocElement[] = []): string {
  const chunks: string[] = [];
  for (const el of elements) {
    if (el.paragraph?.elements) {
      const line = el.paragraph.elements
        .map((p) => p.textRun?.content ?? '')
        .join('');
      chunks.push(line);
    }
    if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        const rowCells = (row.tableCells ?? []).map((cell) =>
          extractTextFromElements(cell.content).trim(),
        );
        chunks.push(`${rowCells.join(' | ')}\n`);
      }
    }
  }
  return chunks.join('');
}

export async function getGoogleDoc(
  accessToken: string,
  documentId: string,
): Promise<GoogleDocContent> {
  const res = await docsFetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
    accessToken,
  );
  const raw = (await res.json()) as {
    documentId: string;
    title?: string;
    body?: { content?: RawDocElement[] };
  };

  const content = raw.body?.content ?? [];
  const lastEl = content[content.length - 1];
  const endIndex = Math.max(1, (lastEl?.endIndex ?? 2) - 1);

  return {
    documentId: raw.documentId,
    title: raw.title ?? 'Sin título',
    bodyText: extractTextFromElements(content).trim(),
    endIndex,
    webViewLink: `https://docs.google.com/document/d/${raw.documentId}/edit`,
  };
}

async function createDocWithText(
  accessToken: string,
  title: string,
  bodyText: string,
): Promise<GoogleDocContent> {
  const createRes = await docsFetch(
    'https://docs.googleapis.com/v1/documents',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    },
  );
  const created = (await createRes.json()) as { documentId: string };

  await docsFetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(created.documentId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: bodyText,
            },
          },
        ],
      }),
    },
  );

  return getGoogleDoc(accessToken, created.documentId);
}

export async function createLaborCertificateGoogleDoc(
  accessToken: string,
  employee: Employee,
  db: PayrollDatabase,
  legislation: LegislationParams,
): Promise<GoogleDocContent> {
  const social = calculateSocialBenefitsForEmployee(employee, legislation);
  const todayStr = formatShortDate(new Date().toISOString());

  const body = [
    `${db.company.name}`,
    `NIT ${db.company.nit} · ${db.company.city}`,
    `${db.company.address}`,
    '',
    'CERTIFICACIÓN LABORAL Y SALARIAL',
    '',
    `Medellín, ${todayStr}`,
    '',
    'A QUIEN INTERESE:',
    '',
    `El Grupo de Investigación INAMOD (${db.company.name}) certifica que ${employee.fullName}, identificado(a) con Cédula de Ciudadanía No. ${employee.documentId}, labora en nuestra institución desde el ${formatShortDate(employee.hireDate)} mediante contrato a ${employee.contractType.toLowerCase()}, desempeñando el cargo de ${employee.role} en el área de ${employee.department}.`,
    '',
    'DETALLE DE REMUNERACIÓN Y SEGURIDAD SOCIAL VIGENTE:',
    `- Salario básico mensual: ${formatCOP(employee.baseSalary)}`,
    `- Auxilio de transporte legal: ${formatCOP(social.auxilioTransporte)}`,
    `- Estado contractual actual: ${employee.status}`,
    `- Nivel de riesgo ARL: Nivel ${employee.arlRiskLevel}`,
    `- Cuenta de dispersión: ${employee.bankName} (${maskBankAccount(employee.bankAccountNumber)})`,
    '',
    'ACUMULADO DE PRESTACIONES SOCIALES PROYECTADO:',
    `- Prima de servicios proporcional: ${formatCOP(social.primaServicios)}`,
    `- Cesantías acumuladas: ${formatCOP(social.cesantias)}`,
    `- Intereses sobre cesantías (12%): ${formatCOP(social.interesesCesantias)}`,
    '',
    `Se expide la presente certificación a solicitud del interesado en la ciudad de ${db.company.city}.`,
    '',
    'Atentamente,',
    'Coordinación Administrativa y Talento Humano',
    `${db.company.name}`,
  ].join('\n');

  return createDocWithText(
    accessToken,
    `Certificado Laboral - ${employee.fullName}`,
    body,
  );
}

export async function createPayrollMinutesGoogleDoc(
  accessToken: string,
  db: PayrollDatabase,
  period: PayrollPeriod,
): Promise<GoogleDocContent> {
  const totalGross = period.payslips.reduce((s, p) => s + p.grossPay, 0);
  const totalDed = period.payslips.reduce((s, p) => s + p.totalDeductions, 0);
  const totalNet = period.payslips.reduce((s, p) => s + p.netPay, 0);

  const lines = [
    `${db.company.name} — NIT ${db.company.nit}`,
    `ACTA DE CIERRE Y LIQUIDACIÓN DE NÓMINA — ${period.label.toUpperCase()}`,
    `Periodicidad: ${period.frequency} · Estado: ${period.status}`,
    '',
    'RESUMEN FINANCIERO DEL PERÍODO:',
    `- Colaboradores liquidados: ${period.payslips.length}`,
    `- Total devengado: ${formatCOP(totalGross)}`,
    `- Total deducciones de ley y otras: ${formatCOP(totalDed)}`,
    `- Neto a dispersar: ${formatCOP(totalNet)}`,
    '',
    'DETALLE POR COLABORADOR:',
    ...period.payslips.map(
      (p) =>
        `• ${p.employeeName} (${p.receiptNumber}) | Devengado: ${formatCOP(p.grossPay)} | Deducciones: ${formatCOP(p.totalDeductions)} | Neto: ${formatCOP(p.netPay)} [${p.paymentStatus}]`,
    ),
    '',
    `Generado desde INAMOD Nómina el ${formatShortDate(new Date().toISOString())}.`,
  ].join('\n');

  return createDocWithText(
    accessToken,
    `Acta de Nómina INAMOD - ${period.label}`,
    lines,
  );
}

export async function appendNoteToGoogleDoc(
  accessToken: string,
  documentId: string,
  endIndex: number,
  noteText: string,
): Promise<GoogleDocContent> {
  await docsFetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: Math.max(1, endIndex) },
              text: `\n\n${noteText}`,
            },
          },
        ],
      }),
    },
  );
  return getGoogleDoc(accessToken, documentId);
}
