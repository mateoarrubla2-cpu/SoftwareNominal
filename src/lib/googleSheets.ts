import { calculateSocialBenefitsForEmployee } from './payrollEngine.ts';
import type { PayrollDatabase, PayrollPeriod } from '../types/payroll.ts';
import type { DriveFile } from './googleDrive.ts';

export interface SpreadsheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: {
    title: string;
  };
  sheets: SpreadsheetTabInfo[];
}

async function sheetsFetch(
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
      payload.error?.message ?? `Error de Google Sheets (${res.status})`,
    );
  }
  return res;
}

export async function listGoogleSpreadsheets(
  accessToken: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '25',
  });
  const res = await sheetsFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken,
  );
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files ?? [];
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string,
): Promise<SpreadsheetMetadata> {
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,gridProperties)`,
    accessToken,
  );
  const raw = (await res.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  };

  return {
    spreadsheetId: raw.spreadsheetId,
    spreadsheetUrl: raw.spreadsheetUrl,
    properties: {
      title: raw.properties?.title ?? 'Sin título',
    },
    sheets: (raw.sheets ?? []).map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? 'Hoja',
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

function escapeSheetRangeName(sheetTitle: string): string {
  const escaped = sheetTitle.replace(/'/g, "''");
  return `'${escaped}'!A1:Z100`;
}

export async function readSpreadsheetSheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
): Promise<string[][]> {
  const range = encodeURIComponent(escapeSheetRangeName(sheetTitle));
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`,
    accessToken,
  );
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

export async function createPayrollGoogleSpreadsheet(
  accessToken: string,
  db: PayrollDatabase,
  period: PayrollPeriod,
): Promise<SpreadsheetMetadata> {
  const title = `Nómina INAMOD SENA - ${period.label} (${period.frequency})`;

  const createRes = await sheetsFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title, locale: 'es_CO' },
        sheets: [
          { properties: { title: 'Nómina del Período' } },
          { properties: { title: 'Prestaciones Sociales' } },
          { properties: { title: 'Vacaciones' } },
          { properties: { title: 'Eventualidades' } },
        ],
      }),
    },
  );
  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };

  const leg =
    db.legislation.find((l) => l.year === period.year) ?? db.legislation[0];
  const empMap = new Map(db.employees.map((e) => [e.id, e]));

  const payrollValues: (string | number)[][] = [
    [
      'Comprobante',
      'Cédula',
      'Colaborador',
      'Cargo',
      'Área',
      'Periodicidad',
      'Salario Básico',
      'Aux. Transporte',
      'Extras y Bonos',
      'Beneficios',
      'Total Devengado',
      'Salud (4%)',
      'Pensión (4%)',
      'FSP + Retefuente',
      'Otras Deducciones',
      'Total Deducciones',
      'Neto a Pagar',
      'Estado',
    ],
    ...period.payslips.map((p) => [
      p.receiptNumber,
      p.employeeDocumentId,
      p.employeeName,
      p.employeeRole,
      p.department,
      p.frequency,
      p.baseSalaryPeriod,
      p.auxilioTransporte,
      p.overtimeAmount + p.performanceBonus,
      p.benefitsTotal,
      p.grossPay,
      p.saludDeduction,
      p.pensionDeduction,
      p.fspDeduction + p.retefuenteDeduction,
      p.otherDeductions,
      p.totalDeductions,
      p.netPay,
      p.paymentStatus,
    ]),
  ];

  const socialValues: (string | number)[][] = [
    [
      'Colaborador',
      'Área',
      'Salario Base',
      'Aux. Transporte',
      'Base Prestacional',
      'Prima de Servicios',
      'Cesantías',
      'Intereses Cesantías (12%)',
      'Aplica Dotación',
      'Observación',
    ],
    ...db.employees
      .filter((e) => e.status !== 'Retirado')
      .map((emp) => {
        const calc = calculateSocialBenefitsForEmployee(emp, leg);
        return [
          emp.fullName,
          emp.department,
          calc.baseSalary,
          calc.auxilioTransporte,
          calc.basePrestacional,
          calc.primaServicios,
          calc.cesantias,
          calc.interesesCesantias,
          calc.aplicaDotacion ? 'Sí' : 'No',
          calc.motivoDotacion,
        ];
      }),
  ];

  const vacationValues: (string | number)[][] = [
    [
      'Solicitud',
      'Colaborador',
      'Tipo',
      'Inicio',
      'Fin',
      'Días Hábiles',
      'Compensación COP',
      'Estado',
    ],
    ...db.vacations.map((v) => [
      v.id,
      empMap.get(v.employeeId)?.fullName ?? v.employeeId,
      v.type,
      v.startDate,
      v.endDate,
      v.businessDays,
      v.compensatedAmount,
      v.status,
    ]),
  ];

  const eventualityValues: (string | number)[][] = [
    [
      'ID',
      'Colaborador',
      'Tipo',
      'Inicio',
      'Fin',
      'Días',
      'Impacto',
      'Monto COP',
      'Estado',
      'Descripción',
    ],
    ...(db.eventualities ?? []).map((ev) => [
      ev.id,
      empMap.get(ev.employeeId)?.fullName ?? ev.employeeId,
      ev.type,
      ev.startDate,
      ev.endDate,
      ev.days,
      ev.payrollImpact,
      ev.amount,
      ev.status,
      ev.description,
    ]),
  ];

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(created.spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Nómina del Período'!A1", values: payrollValues },
          { range: "'Prestaciones Sociales'!A1", values: socialValues },
          { range: "'Vacaciones'!A1", values: vacationValues },
          { range: "'Eventualidades'!A1", values: eventualityValues },
        ],
      }),
    },
  );

  // Format header rows cleanly
  const tabIds = (created.sheets ?? [])
    .map((s) => s.properties?.sheetId)
    .filter((id): id is number => id !== undefined);
  if (tabIds.length > 0) {
    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(created.spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: tabIds.map((sheetId) => ({
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          })),
        }),
      },
    ).catch(() => undefined);
  }

  return getSpreadsheetMetadata(accessToken, created.spreadsheetId);
}

export async function updateExistingSpreadsheetTab(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  values: (string | number)[][],
): Promise<void> {
  const escaped = sheetTitle.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escaped}'!A1`);
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    },
  );
}
