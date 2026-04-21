export type Report = { propName: string; message: string };

export type ApiResult<T> = { data: T; success: boolean; errors?: Report[]; message: string };
