export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

async function gmailFetch(
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
    throw new Error(payload.error?.message ?? `Error de Gmail (${res.status})`);
  }
  return res;
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function blobToBase64Chunks(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  return base64.replace(/(.{76})/g, '$1\r\n');
}

function encodeRfc2047(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export async function listGmailMessages(
  accessToken: string,
  query = '',
  maxResults = 12,
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const listRes = await gmailFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    accessToken,
  );
  const listData = (await listRes.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const items = listData.messages ?? [];
  if (items.length === 0) return [];

  const details = await Promise.all(
    items.map(async (m) => {
      const msgRes = await gmailFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        accessToken,
      );
      const raw = (await msgRes.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: {
          headers?: Array<{ name?: string; value?: string }>;
        };
      };
      const headers = raw.payload?.headers ?? [];
      const getH = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? '';
      return {
        id: raw.id,
        threadId: raw.threadId,
        from: getH('From'),
        to: getH('To'),
        subject: getH('Subject') || '(Sin asunto)',
        date: getH('Date'),
        snippet: raw.snippet ?? '',
        labelIds: raw.labelIds ?? [],
      } satisfies GmailMessageSummary;
    }),
  );

  return details;
}

async function buildRawMimeEmail(options: {
  to: string;
  subject: string;
  bodyText: string;
  attachment?: {
    filename: string;
    mimeType: string;
    blob: Blob;
  };
}): Promise<string> {
  const encodedSubject = encodeRfc2047(options.subject);

  if (!options.attachment) {
    const raw = [
      `To: ${options.to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      options.bodyText,
    ].join('\r\n');
    return encodeBase64UrlUtf8(raw);
  }

  const boundary = `inamod_boundary_${Date.now().toString(36)}`;
  const attachmentBase64 = await blobToBase64Chunks(options.attachment.blob);
  const rawMultipart = [
    `To: ${options.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    options.bodyText,
    '',
    `--${boundary}`,
    `Content-Type: ${options.attachment.mimeType}; name="${options.attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${options.attachment.filename}"`,
    '',
    attachmentBase64,
    `--${boundary}--`,
  ].join('\r\n');

  return encodeBase64UrlUtf8(rawMultipart);
}

export async function sendGmailMessage(
  accessToken: string,
  options: {
    to: string;
    subject: string;
    bodyText: string;
    attachment?: {
      filename: string;
      mimeType: string;
      blob: Blob;
    };
  },
): Promise<{ id: string }> {
  const raw = await buildRawMimeEmail(options);
  const res = await gmailFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ raw }),
    },
  );
  return (await res.json()) as { id: string };
}

export async function createGmailDraft(
  accessToken: string,
  options: {
    to: string;
    subject: string;
    bodyText: string;
    attachment?: {
      filename: string;
      mimeType: string;
      blob: Blob;
    };
  },
): Promise<{ id: string }> {
  const raw = await buildRawMimeEmail(options);
  const res = await gmailFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ message: { raw } }),
    },
  );
  return (await res.json()) as { id: string };
}

export async function trashGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<void> {
  await gmailFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`,
    accessToken,
    { method: 'POST' },
  );
}
