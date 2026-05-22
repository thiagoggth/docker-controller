export type CredentialMode = 'structured' | 'textual';

export type CredentialTargetType = 'container' | 'compose_container' | 'compose_group';

export interface CredentialTargetDTO {
  targetKey: string;
  targetType: CredentialTargetType;
  displayName: string;
}

export interface CredentialItemDTO {
  id: number | null;
  name: string;
  login: string;
  password: string;
}

export interface CredentialRecordDTO {
  target: CredentialTargetDTO;
  mode: CredentialMode;
  text: string;
  items: CredentialItemDTO[];
}

export interface SaveCredentialRecordInput {
  target: CredentialTargetDTO;
  mode: CredentialMode;
  text: string;
  items: CredentialItemDTO[];
}
