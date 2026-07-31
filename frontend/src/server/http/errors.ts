export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}
