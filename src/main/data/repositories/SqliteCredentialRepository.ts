import { ICredentialRepository } from '@core/application/repositories/ICredentialRepository';
import { CredentialStorageError } from '@core/domain/errors/CredentialStorageError';
import {
  CredentialItemDTO,
  CredentialMode,
  CredentialRecordDTO,
  CredentialTargetDTO,
  CredentialTargetType,
  SaveCredentialRecordInput,
} from '@core/shared/dtos/CredentialDTO';
import Database from 'better-sqlite3';
import { app, safeStorage } from 'electron';
import { join } from 'path';

type TargetRow = {
  target_key: string;
  target_type: CredentialTargetType;
  display_name: string;
  mode: CredentialMode;
  text_encrypted: string | null;
};

type ItemRow = {
  id: number;
  name: string;
  login: string;
  password_encrypted: string | null;
};

export class SqliteCredentialRepository implements ICredentialRepository {
  private readonly database: Database.Database;

  constructor(databasePath = join(app.getPath('userData'), 'credentials.sqlite')) {
    this.database = new Database(databasePath);
    this.database.pragma('foreign_keys = ON');
    this.ensureSchema();
  }

  getByTarget(target: CredentialTargetDTO): CredentialRecordDTO {
    const row = this.database
      .prepare<[string], TargetRow>(
        `
          SELECT target_key, target_type, display_name, mode, text_encrypted
          FROM credential_targets
          WHERE target_key = ?
        `,
      )
      .get(target.targetKey);

    if (!row) {
      return {
        target,
        mode: 'structured',
        text: '',
        items: [],
      };
    }

    const items = this.database
      .prepare<[string], ItemRow>(
        `
          SELECT id, name, login, password_encrypted
          FROM credential_items
          WHERE target_key = ?
          ORDER BY position ASC, id ASC
        `,
      )
      .all(target.targetKey)
      .map((item) => this.mapItemRow(item));

    return {
      target: {
        targetKey: row.target_key,
        targetType: row.target_type,
        displayName: row.display_name,
      },
      mode: row.mode,
      text: this.decrypt(row.text_encrypted),
      items,
    };
  }

  save(input: SaveCredentialRecordInput): CredentialRecordDTO {
    const now = new Date().toISOString();
    const items = this.normalizeItems(input.items);
    const textEncrypted = this.encrypt(input.text);

    const saveTransaction = this.database.transaction(() => {
      this.database
        .prepare(
          `
            INSERT INTO credential_targets (
              target_key,
              target_type,
              display_name,
              mode,
              text_encrypted,
              created_at,
              updated_at
            )
            VALUES (@targetKey, @targetType, @displayName, @mode, @textEncrypted, @now, @now)
            ON CONFLICT(target_key) DO UPDATE SET
              target_type = excluded.target_type,
              display_name = excluded.display_name,
              mode = excluded.mode,
              text_encrypted = excluded.text_encrypted,
              updated_at = excluded.updated_at
          `,
        )
        .run({
          targetKey: input.target.targetKey,
          targetType: input.target.targetType,
          displayName: input.target.displayName,
          mode: input.mode,
          textEncrypted,
          now,
        });

      this.database
        .prepare('DELETE FROM credential_items WHERE target_key = ?')
        .run(input.target.targetKey);

      const insertItem = this.database.prepare(
        `
          INSERT INTO credential_items (
            target_key,
            name,
            login,
            password_encrypted,
            position,
            created_at,
            updated_at
          )
          VALUES (@targetKey, @name, @login, @passwordEncrypted, @position, @now, @now)
        `,
      );

      items.forEach((item, index) => {
        insertItem.run({
          targetKey: input.target.targetKey,
          name: item.name,
          login: item.login,
          passwordEncrypted: this.encrypt(item.password),
          position: index,
          now,
        });
      });
    });

    saveTransaction();

    return this.getByTarget(input.target);
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS credential_targets (
        target_key TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        display_name TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'structured',
        text_encrypted TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credential_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_key TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        login TEXT NOT NULL DEFAULT '',
        password_encrypted TEXT,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (target_key)
          REFERENCES credential_targets(target_key)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS credential_items_target_key_idx
        ON credential_items(target_key);
    `);
  }

  private normalizeItems(items: CredentialItemDTO[]): CredentialItemDTO[] {
    return items
      .map((item) => ({
        id: item.id ?? null,
        name: item.name.trim(),
        login: item.login.trim(),
        password: item.password,
      }))
      .filter((item) => item.name || item.login || item.password);
  }

  private mapItemRow(row: ItemRow): CredentialItemDTO {
    return {
      id: row.id,
      name: row.name,
      login: row.login,
      password: this.decrypt(row.password_encrypted),
    };
  }

  private encrypt(value: string): string | null {
    if (!value) {
      return null;
    }

    this.ensureEncryptionAvailable();
    return safeStorage.encryptString(value).toString('base64');
  }

  private decrypt(value: string | null): string {
    if (!value) {
      return '';
    }

    this.ensureEncryptionAvailable();
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  }

  private ensureEncryptionAvailable(): void {
    if (safeStorage.isEncryptionAvailable()) {
      return;
    }

    throw new CredentialStorageError(
      'A criptografia local não está disponível para salvar ou ler credenciais.',
    );
  }
}
