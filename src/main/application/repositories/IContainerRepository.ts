import { Container } from '@core/domain/entities/Container';

export interface IContainerRepository {
  listAll(): Promise<Container[]>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
}
