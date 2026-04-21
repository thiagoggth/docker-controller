import { Report } from '../types/ApiTypes';

export default class ApiSendError extends Error {
  public readonly errors?: Report[];
  constructor(message: string, errors?: Report[]) {
    super(message);
    this.errors = errors;
  }
}
