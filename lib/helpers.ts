export function getConfig<T>(config: unknown): T {
    return (config || {}) as T;
}