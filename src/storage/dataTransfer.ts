import { savedLoansStorage } from './savedLoans';
import { LOAN_GROUP_SCHEMA_VERSION, LoanGroup } from '@/types/SavedLoan';

// JSON export/import for saved loans. MMKV is device-local, so without this a user
// tracking a mortgage for years loses everything on phone loss/reset/reinstall. The
// export is a plain JSON envelope shared via the OS sheet; import is validated then
// handed to savedLoansStorage.importAll, which re-runs the normal load-time
// migration so older exports upgrade to the current schema.

export const BACKUP_APP_ID = 'loanbee';
export const BACKUP_TYPE = 'saved-loans-backup';

export interface SavedLoansBackup {
  app: typeof BACKUP_APP_ID;
  type: typeof BACKUP_TYPE;
  schemaVersion: typeof LOAN_GROUP_SCHEMA_VERSION;
  exportedAt: string;
  loans: LoanGroup[];
}

export type DataTransferErrorCode = 'invalidJson' | 'invalidShape' | 'empty';

export class DataTransferError extends Error {
  constructor(readonly code: DataTransferErrorCode) {
    super(code);
    this.name = 'DataTransferError';
  }
}

/** Serialises all saved loans into a shareable, pretty-printed backup string. */
export const buildSavedLoansBackup = (now: Date = new Date()): string => {
  const backup: SavedLoansBackup = {
    app: BACKUP_APP_ID,
    type: BACKUP_TYPE,
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    loans: savedLoansStorage.getAll(),
  };
  return JSON.stringify(backup, null, 2);
};

// A backup is trustworthy enough to import when every entry is an object carrying
// the fields the load-time migration needs. Deeper validation is deliberately left
// to savedLoansStorage.importAll's normalisation path (single source of truth).
const isImportableLoan = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const loan = value as Record<string, unknown>;
  return (
    typeof loan.id === 'string' &&
    typeof loan.formSnapshot === 'object' &&
    loan.formSnapshot !== null &&
    typeof loan.resultSnapshot === 'object' &&
    loan.resultSnapshot !== null
  );
};

/**
 * Parses + validates a backup string. Accepts either the {@link SavedLoansBackup}
 * envelope or a bare array of loans. Throws {@link DataTransferError} on bad input
 * and never mutates storage — callers confirm before applying.
 */
export const parseSavedLoansBackup = (raw: string): LoanGroup[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DataTransferError('invalidJson');
  }

  const loans = Array.isArray(parsed)
    ? parsed
    : (parsed as Partial<SavedLoansBackup> | null)?.loans;

  if (!Array.isArray(loans)) throw new DataTransferError('invalidShape');
  if (loans.length === 0) throw new DataTransferError('empty');
  if (!loans.every(isImportableLoan)) throw new DataTransferError('invalidShape');

  return loans as LoanGroup[];
};

/** Validates and applies a backup string, returning the imported (normalised) loans. */
export const importSavedLoansBackup = (raw: string): LoanGroup[] => {
  const loans = parseSavedLoansBackup(raw);
  return savedLoansStorage.importAll(loans);
};
