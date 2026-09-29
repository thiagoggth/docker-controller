import {
  ContainerStreamDataDTO,
  ContainerStreamErrorDTO,
  ContainerStreamSessionDTO,
} from '@core/shared/types/ContainerStreamTypes';

export type ContainerLogsEvent =
  | { type: 'data'; payload: ContainerStreamDataDTO }
  | { type: 'ended'; payload: ContainerStreamSessionDTO }
  | { type: 'error'; payload: ContainerStreamErrorDTO };

function getSessionId(event: ContainerLogsEvent): string {
  return event.payload.sessionId;
}

export function createContainerLogsEventGate(onEvent: (event: ContainerLogsEvent) => void): {
  receive: (event: ContainerLogsEvent) => void;
  setSessionId: (sessionId: string) => void;
  dispose: () => void;
} {
  let sessionId: string | null = null;
  let pendingEvents: ContainerLogsEvent[] = [];
  let disposed = false;

  return {
    receive: (event) => {
      if (disposed) {
        return;
      }

      if (!sessionId) {
        pendingEvents.push(event);
      } else if (getSessionId(event) === sessionId) {
        onEvent(event);
      }
    },
    setSessionId: (nextSessionId) => {
      if (disposed) {
        return;
      }

      sessionId = nextSessionId;
      pendingEvents.filter((event) => getSessionId(event) === sessionId).forEach(onEvent);
      pendingEvents = [];
    },
    dispose: () => {
      disposed = true;
      pendingEvents = [];
    },
  };
}
