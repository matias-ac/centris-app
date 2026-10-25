import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@centris/shared";

export class DomainException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly details: Record<string, string[]> | null;

  constructor(
    errorCode: ErrorCode,
    message: string,
    status: HttpStatus,
    details: Record<string, string[]> | null = null
  ) {
    super({ statusCode: status, errorCode, message, details }, status);
    this.errorCode = errorCode;
    this.details = details;
  }
}
