import { IUseCase } from '../IUseCase';
import { shell } from 'electron';

export interface OpenComposeFolderInput {
  path: string;
}

export class OpenComposeFolderUseCase implements IUseCase<OpenComposeFolderInput, void> {
  async execute(input: OpenComposeFolderInput): Promise<void> {
    shell.showItemInFolder(input.path);
  }
}
