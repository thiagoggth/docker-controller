import { ContainerStreamSessionDTO } from '@core/shared/types/ContainerStreamTypes';

export async function resolveStartedSession(
  start: Promise<ContainerStreamSessionDTO>,
  isDisposed: () => boolean,
  stop: (sessionId: string) => Promise<void>,
): Promise<string | null> {
  const { sessionId } = await start;

  if (isDisposed()) {
    await stop(sessionId);
    return null;
  }

  return sessionId;
}
