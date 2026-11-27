// src/lib/draftDb.ts
import type { IndexStatus } from "../types";
import type { UploadState } from "./upload";
import type { ReplyQuote } from "./userTurn";

export interface PersistedPastedText {
  localId: string;
  text: string;
}

export interface PersistedAttachment {
  localId: string;
  fileId: string | null;
  name: string;
  mime: string;
  size: number;
  progress: number;
  state: UploadState;
  error?: string;
  indexStatus?: IndexStatus | null;
  processingDeadline?: number;
}

export interface PersistedDraft {
  text: string;
  attachments: PersistedAttachment[];
  pastedTexts: PersistedPastedText[];
  reply?: ReplyQuote;
}

const DB_NAME = "renschat-drafts";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Gagal membuka IndexedDB"));
  });
  return dbPromise;
}

function draftKey(userId: string, key: string): string {
  return `${userId}::${key}`;
}

function blobKey(userId: string, localId: string): string {
  return `${userId}::${localId}`;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan"));
  });
}

export async function saveDraft(
  userId: string,
  key: string,
  draft: PersistedDraft,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_DRAFTS, "readwrite");
  tx.objectStore(STORE_DRAFTS).put(draft, draftKey(userId, key));
  await txDone(tx);
}

export async function loadDraft(
  userId: string,
  key: string,
): Promise<PersistedDraft | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_DRAFTS, "readonly");
  const req = tx.objectStore(STORE_DRAFTS).get(draftKey(userId, key));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PersistedDraft) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Gagal memuat draft"));
  });
}

export async function deleteDraft(userId: string, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_DRAFTS, "readwrite");
  tx.objectStore(STORE_DRAFTS).delete(draftKey(userId, key));
  await txDone(tx);
}

export async function moveDraft(
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<void> {
  if (fromKey === toKey) return;
  const db = await openDb();
  const tx = db.transaction(STORE_DRAFTS, "readwrite");
  const store = tx.objectStore(STORE_DRAFTS);
  const req = store.get(draftKey(userId, fromKey));
  req.onsuccess = () => {
    const val = req.result as PersistedDraft | undefined;
    if (val) {
      store.put(val, draftKey(userId, toKey));
    }
    store.delete(draftKey(userId, fromKey));
  };
  await txDone(tx);
}

export async function listDrafts(
  userId: string,
): Promise<Array<[string, PersistedDraft]>> {
  const db = await openDb();
  const tx = db.transaction(STORE_DRAFTS, "readonly");
  const store = tx.objectStore(STORE_DRAFTS);
  const prefix = `${userId}::`;
  const out: Array<[string, PersistedDraft]> = [];
  return new Promise((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      const k = cursor.key as string;
      if (k.startsWith(prefix)) {
        out.push([k.substring(prefix.length), cursor.value as PersistedDraft]);
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error("Gagal membaca drafts"));
  });
}

export async function saveFileBlob(
  userId: string,
  localId: string,
  file: Blob,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_BLOBS, "readwrite");
  tx.objectStore(STORE_BLOBS).put(file, blobKey(userId, localId));
  await txDone(tx);
}

export async function loadFileBlob(
  userId: string,
  localId: string,
): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_BLOBS, "readonly");
  const req = tx.objectStore(STORE_BLOBS).get(blobKey(userId, localId));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Gagal memuat file"));
  });
}

export async function deleteFileBlob(
  userId: string,
  localId: string,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_BLOBS, "readwrite");
  tx.objectStore(STORE_BLOBS).delete(blobKey(userId, localId));
  await txDone(tx);
}

export async function clearUser(userId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE_DRAFTS, STORE_BLOBS], "readwrite");
  const prefix = `${userId}::`;
  const clearPrefix = (storeName: string): void => {
    const store = tx.objectStore(storeName);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const k = cursor.key as string;
      if (k.startsWith(prefix)) cursor.delete();
      cursor.continue();
    };
  };
  clearPrefix(STORE_DRAFTS);
  clearPrefix(STORE_BLOBS);
  await txDone(tx);
}
