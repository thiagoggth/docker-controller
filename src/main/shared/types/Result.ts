export type Report = { propName: string; message: string };

export type Result<T> = { data: T; success: boolean; error?: Report[]; message: string };
