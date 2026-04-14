import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { Readable } from "stream";

const FOLDER_NAME = "InCaseOf Emergency Kit";

function getDrive(auth: OAuth2Client) {
  return google.drive({ version: "v3", auth });
}

/**
 * Create the InCaseOf folder on Drive (or find existing)
 */
export async function createIncaseFolder(auth: OAuth2Client): Promise<string> {
  const drive = getDrive(auth);

  const existing = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Write a plain text/JSON file (used for _meta.json which is unencrypted)
 */
export async function writeFileRaw(
  auth: OAuth2Client,
  folderId: string,
  filename: string,
  content: string,
  mimeType = "application/json"
): Promise<string> {
  const drive = getDrive(auth);
  const existingId = await findFileByName(auth, folderId, filename);

  if (existingId) {
    await drive.files.update({
      fileId: existingId,
      media: { mimeType, body: content },
    });
    return existingId;
  }

  const file = await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType },
    media: { mimeType, body: content },
    fields: "id",
  });

  return file.data.id!;
}

/**
 * Write encrypted data (base64url string) as a binary file
 */
export async function writeEncrypted(
  auth: OAuth2Client,
  folderId: string,
  filename: string,
  encryptedData: string
): Promise<string> {
  // Store the encrypted base64url string as plain text
  return writeFileRaw(auth, folderId, filename, encryptedData, "text/plain");
}

/**
 * Write binary data (for encrypted file uploads)
 */
export async function writeBinary(
  auth: OAuth2Client,
  folderId: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const drive = getDrive(auth);
  const existingId = await findFileByName(auth, folderId, filename);
  const stream = Readable.from(data);

  if (existingId) {
    await drive.files.update({
      fileId: existingId,
      media: { mimeType: "application/octet-stream", body: stream },
    });
    return existingId;
  }

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: "application/octet-stream",
    },
    media: { mimeType: "application/octet-stream", body: stream },
    fields: "id",
  });

  return file.data.id!;
}

/**
 * Read a file's content as string
 */
export async function readFileRaw(
  auth: OAuth2Client,
  folderId: string,
  filename: string
): Promise<string | null> {
  const fileId = await findFileByName(auth, folderId, filename);
  if (!fileId) return null;

  const drive = getDrive(auth);
  const response = await drive.files.get({
    fileId,
    alt: "media",
  });

  // Drive API may return parsed JSON or string depending on mimeType
  if (typeof response.data === "string") {
    return response.data;
  }
  return JSON.stringify(response.data);
}

/**
 * Read a file as binary buffer
 */
export async function readFileBinary(
  auth: OAuth2Client,
  folderId: string,
  filename: string
): Promise<Buffer | null> {
  const fileId = await findFileByName(auth, folderId, filename);
  if (!fileId) return null;

  const drive = getDrive(auth);
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Find a file by name within a folder
 */
export async function findFileByName(
  auth: OAuth2Client,
  folderId: string,
  filename: string
): Promise<string | null> {
  const drive = getDrive(auth);
  const result = await drive.files.list({
    q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (result.data.files && result.data.files.length > 0) {
    return result.data.files[0].id!;
  }
  return null;
}

/**
 * List all files in a folder
 */
export async function listFiles(
  auth: OAuth2Client,
  folderId: string
): Promise<{ name: string; id: string }[]> {
  const drive = getDrive(auth);
  const result = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  return (result.data.files || [])
    .filter((f) => f.name && f.id)
    .map((f) => ({ name: f.name!, id: f.id! }));
}

/**
 * Read all encrypted step files + unencrypted metadata
 * Returns { _meta: MetadataFile, "about-you": "encrypted...", health: "encrypted...", ... }
 */
export async function readAllFiles(
  auth: OAuth2Client,
  folderId: string
): Promise<Record<string, string>> {
  const drive = getDrive(auth);
  const files = await listFiles(auth, folderId);
  const result: Record<string, string> = {};

  for (const file of files) {
    // Skip attachment files in the "all files" read
    if (file.name.startsWith("att_")) continue;

    try {
      const response = await drive.files.get({
        fileId: file.id,
        alt: "media",
      });

      const key = file.name.replace(".json", "").replace(".enc", "");
      if (typeof response.data === "string") {
        result[key] = response.data;
      } else {
        result[key] = JSON.stringify(response.data);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return result;
}

/**
 * Delete a file from the folder
 */
export async function deleteFile(
  auth: OAuth2Client,
  folderId: string,
  filename: string
): Promise<void> {
  const fileId = await findFileByName(auth, folderId, filename);
  if (!fileId) return;

  const drive = getDrive(auth);
  await drive.files.delete({ fileId });
}

/**
 * Share folder with "anyone with link can view"
 */
export async function shareFolder(
  auth: OAuth2Client,
  folderId: string
): Promise<string> {
  const drive = getDrive(auth);

  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const file = await drive.files.get({
    fileId: folderId,
    fields: "webViewLink",
  });

  return file.data.webViewLink || "";
}
