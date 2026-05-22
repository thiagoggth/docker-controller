import {
  CredentialItemDTO,
  CredentialMode,
  CredentialRecordDTO,
  CredentialTargetDTO,
} from '@core/shared/dtos/CredentialDTO';
import { credentialService } from '@gui/services/credentialService';
import React, { useMemo, useState } from 'react';
import { FiCopy, FiPlus, FiTrash2 } from 'react-icons/fi';

type EditableCredentialItem = CredentialItemDTO & {
  rowKey: string;
};

interface CredentialModalProps {
  target: CredentialTargetDTO;
  onClose: () => void;
}

interface CredentialModalState {
  mode: CredentialMode;
  text: string;
  items: EditableCredentialItem[];
  error: string | null;
}

function createRow(item?: CredentialItemDTO): EditableCredentialItem {
  return {
    id: item?.id ?? null,
    name: item?.name ?? '',
    login: item?.login ?? '',
    password: item?.password ?? '',
    rowKey: `${item?.id ?? 'new'}-${crypto.randomUUID()}`,
  };
}

function buildRows(record: CredentialRecordDTO | null): EditableCredentialItem[] {
  if (!record || record.items.length === 0) {
    return [createRow()];
  }

  return record.items.map((item) => createRow(item));
}

function readInitialState(target: CredentialTargetDTO): CredentialModalState {
  try {
    const record = credentialService.get(target);

    return {
      mode: record.mode,
      text: record.text,
      items: buildRows(record),
      error: null,
    };
  } catch (loadError) {
    const message =
      loadError instanceof Error ? loadError.message : 'Falha ao carregar credenciais';

    return {
      mode: 'structured',
      text: '',
      items: [createRow()],
      error: message,
    };
  }
}

export function CredentialModal({ target, onClose }: CredentialModalProps): React.JSX.Element {
  const initialState = useMemo(() => readInitialState(target), [target]);
  const [mode, setMode] = useState<CredentialMode>(initialState.mode);
  const [text, setText] = useState(initialState.text);
  const [items, setItems] = useState<EditableCredentialItem[]>(initialState.items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(initialState.error);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const title = useMemo(() => {
    return `Credenciais - ${target.displayName}`;
  }, [target]);

  const updateItem = (
    rowKey: string,
    field: keyof Pick<CredentialItemDTO, 'name' | 'login' | 'password'>,
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) => (item.rowKey === rowKey ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems((current) => [...current, createRow()]);
  };

  const removeItem = (rowKey: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.rowKey !== rowKey);
      return next.length > 0 ? next : [createRow()];
    });
  };

  const copyValue = async (value: string, key: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1400);
    } catch {
      setError('Falha ao copiar para a área de transferência');
    }
  };

  const save = () => {
    setSaving(true);
    setError(null);

    try {
      credentialService.save({
        target,
        mode,
        text,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          login: item.login,
          password: item.password,
        })),
      });
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Falha ao salvar credenciais';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded border bg-base-100 shadow-xl"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-base-content">{title}</h2>
          </div>

          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-base-content">
            <span>Textual</span>
            <input
              checked={mode === 'textual'}
              className="toggle toggle-primary toggle-sm"
              onChange={(event) => setMode(event.target.checked ? 'textual' : 'structured')}
              type="checkbox"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          {error && (
            <div className="mb-3 rounded border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          {mode === 'textual' && (
            <textarea
              className="min-h-72 w-full resize-y rounded border bg-base-200 p-3 text-sm text-base-content outline-none transition-colors focus:border-primary"
              onChange={(event) => setText(event.target.value)}
              value={text}
            />
          )}

          {mode === 'structured' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded border">
                <table className="min-w-[680px] w-full border-collapse text-left text-xs">
                  <thead className="bg-base-200 text-base-content/70">
                    <tr>
                      <th className="w-[28%] px-3 py-2 font-semibold">Nome</th>
                      <th className="w-[28%] px-3 py-2 font-semibold">Login</th>
                      <th className="w-[34%] px-3 py-2 font-semibold">Senha</th>
                      <th className="w-16 px-3 py-2 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr className="border-t" key={item.rowKey}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border bg-base-100 px-2 py-1.5 text-sm text-base-content outline-none transition-colors focus:border-primary"
                            onChange={(event) =>
                              updateItem(item.rowKey, 'name', event.target.value)
                            }
                            value={item.name}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              className="min-w-0 flex-1 rounded border bg-base-100 px-2 py-1.5 text-sm text-base-content outline-none transition-colors focus:border-primary"
                              onChange={(event) =>
                                updateItem(item.rowKey, 'login', event.target.value)
                              }
                              value={item.login}
                            />
                            <button
                              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-primary"
                              onClick={() => copyValue(item.login, `${item.rowKey}:login`)}
                              title={
                                copiedKey === `${item.rowKey}:login`
                                  ? 'Login copiado'
                                  : 'Copiar login'
                              }
                              type="button"
                            >
                              <FiCopy aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              className="min-w-0 flex-1 rounded border bg-base-100 px-2 py-1.5 text-sm text-base-content outline-none transition-colors focus:border-primary"
                              onChange={(event) =>
                                updateItem(item.rowKey, 'password', event.target.value)
                              }
                              value={item.password}
                            />
                            <button
                              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-primary"
                              onClick={() => copyValue(item.password, `${item.rowKey}:password`)}
                              title={
                                copiedKey === `${item.rowKey}:password`
                                  ? 'Senha copiada'
                                  : 'Copiar senha'
                              }
                              type="button"
                            >
                              <FiCopy aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded text-base-content/60 transition-colors hover:bg-error/10 hover:text-error"
                            onClick={() => removeItem(item.rowKey)}
                            title="Remover linha"
                            type="button"
                          >
                            <FiTrash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="app-button-outline-success flex w-fit cursor-pointer items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors"
                onClick={addItem}
                type="button"
              >
                <FiPlus aria-hidden="true" className="h-4 w-4" />
                Add
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            className="cursor-pointer rounded border px-3 py-1.5 text-xs font-semibold text-base-content transition-colors hover:bg-base-200"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="cursor-pointer rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content transition-colors hover:bg-primary/85 disabled:cursor-default disabled:opacity-60"
            disabled={saving}
            onClick={save}
            type="button"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
