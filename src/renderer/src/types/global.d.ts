// import { ContainerDTO } from '@core/shared/dtos/ContainerDTO';
// import { Result } from '@core/shared/types/Result';

// declare global {
//   interface Window {
//     api: {
//       containers: {
//         list: () => Promise<ContainerDTO[]>;
//         start: (id: string) => Promise<Result<void>>;
//         stop: (id: string) => Promise<Result<void>>;
//         onUpdated: (callback: (dtos: ContainerDTO[]) => void) => void;
//         offUpdated: (callback: (dtos: ContainerDTO[]) => void) => void;
//       };
//       settings: {
//         setAutoReload: (enabled: boolean) => Promise<Result<void>>;
//         getAutoReload: () => Promise<Result<{ enabled: boolean }>>;
//       };
//     };
//   }
// }

// export {};
