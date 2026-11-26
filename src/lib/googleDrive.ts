import { getAccessToken } from './googleAuth.ts';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  trashed?: boolean;
}

export interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface DriveAboutResponse {
  user?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
}

export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

async function driveFetch(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    const errPayload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      errPayload.error?.message ?? `Error de Google Drive (${res.status})`,
    );
  }

  return res;
}

export async function getDriveAbout(
  accessToken: string,
): Promise<DriveAboutResponse> {
  const res = await driveFetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive)',
    accessToken,
  );
  return (await res.json()) as DriveAboutResponse;
}

export async function listDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    searchQuery?: string;
    mimeFilter?: 'all' | 'folders' | 'pdf' | 'spreadsheets' | 'docs';
    pageSize?: number;
  } = {},
): Promise<DriveFile[]> {
  const { folderId, searchQuery, mimeFilter = 'all', pageSize = 50 } = options;

  const qParts: string[] = ['trashed = false'];

  if (searchQuery && searchQuery.trim()) {
    const safe = searchQuery.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    qParts.push(`name contains '${safe}'`);
  } else if (folderId) {
    qParts.push(`'${folderId}' in parents`);
  } else {
    qParts.push(`'root' in parents`);
  }

  if (mimeFilter === 'folders') {
    qParts.push(`mimeType = '${DRIVE_FOLDER_MIME}'`);
  } else if (mimeFilter === 'pdf') {
    qParts.push(`mimeType = 'application/pdf'`);
  } else if (mimeFilter === 'spreadsheets') {
    qParts.push(
      `(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')`,
    );
  } else if (mimeFilter === 'docs') {
    qParts.push(
      `(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/json' or mimeType = 'text/plain')`,
    );
  }

  const params = new URLSearchParams({
    q: qParts.join(' and '),
    fields:
      'files(id,name,mimeType,size,modifiedTime,webViewLink,parents,trashed)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: String(pageSize),
  });

  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken,
  );
  const data = (await res.json()) as DriveListResponse;
  return data.files ?? [];
}

export async function ensureInamodFolder(
  accessToken: string,
  folderName = 'INAMOD Nómina - SENA',
): Promise<DriveFile> {
  const safeName = folderName.replace(/'/g, "\\'");
  const params = new URLSearchParams({
    q: `name = '${safeName}' and mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime)',
    pageSize: '1',
  });
  const checkRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken,
  );
  const existing = (await checkRes.json()) as DriveListResponse;
  if (existing.files && existing.files.length > 0) {
    return existing.files[0];
  }

  return createDriveFolder(accessToken, folderName);
}

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: DRIVE_FOLDER_MIME,
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await driveFetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,modifiedTime',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    },
  );
  return (await res.json()) as DriveFile;
}

export async function uploadBlobToDrive(
  accessToken: string,
  options: {
    blob: Blob;
    filename: string;
    mimeType: string;
    parentId?: string;
    description?: string;
  },
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: options.filename,
    mimeType: options.mimeType,
  };
  if (options.parentId) {
    metadata.parents = [options.parentId];
  }
  if (options.description) {
    metadata.description = options.description;
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', options.blob, options.filename);

  const res = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    accessToken,
    {
      method: 'POST',
      body: form,
    },
  );
  return (await res.json()) as DriveFile;
}

export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string,
): Promise<DriveFile> {
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    },
  );
  return (await res.json()) as DriveFile;
}

export async function trashDriveFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    },
  );
}

export async function deleteDriveFilePermanently(
  accessToken: string,
  fileId: string,
): Promise<void> {
  await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    accessToken,
    {
      method: 'DELETE',
    },
  );
}

export async function downloadDriveFile(
  accessToken: string,
  file: DriveFile,
): Promise<void> {
  const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');
  let url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
  let downloadName = file.name;

  if (isGoogleDoc) {
    const exportMime =
      file.mimeType === 'application/vnd.google-apps.spreadsheet'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    const ext =
      file.mimeType === 'application/vnd.google-apps.spreadsheet'
        ? '.xlsx'
        : '.pdf';
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportMime)}`;
    if (!downloadName.toLowerCase().endsWith(ext)) {
      downloadName += ext;
    }
  }

  const res = await driveFetch(url, accessToken);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function syncExportToDriveIfConnected(options: {
  blob: Blob;
  filename: string;
  mimeType: string;
  description?: string;
}): Promise<{ uploaded: boolean; error?: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { uploaded: false };
  }

  try {
    const folder = await ensureInamodFolder(accessToken);
    await uploadBlobToDrive(accessToken, {
      ...options,
      parentId: folder.id,
      description:
        options.description ?? 'Exportado automáticamente desde INAMOD Nómina',
    });
    return { uploaded: true };
  } catch (err) {
    return {
      uploaded: false,
      error:
        err instanceof Error
          ? err.message
          : 'No se pudo respaldar en Google Drive',
    };
  }
}
