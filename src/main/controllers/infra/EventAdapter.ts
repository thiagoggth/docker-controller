import { IUseCase } from '@core/application/IUseCase';
import { mapErrorToReports } from '../errorMapper';

export abstract class EventAdapter {
  public static ExecuteEvent<T, R>(useCase: IUseCase<T, R>, message: string = 'Sucesso') {
    return async (event: Electron.IpcMainEvent, data: T) => {
      try {
        const result = await useCase.execute(data);
        event.returnValue = {
          data: result,
          success: true,
          message,
        };
      } catch (error) {
        const reports = mapErrorToReports(error);
        event.returnValue = {
          data: undefined as T,
          success: false,
          error: reports,
          message: reports.map((r) => r.message).join('; '),
        };
      }
    };
  }
}
