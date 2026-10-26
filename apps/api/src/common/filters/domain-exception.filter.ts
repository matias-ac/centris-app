import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { ERROR_CODES, type ErrorResponse } from "@centris/shared";
import type { Response } from "express";
import { DomainException } from "../errors/domain.exception.js";

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DomainException) {
      const status = exception.getStatus();
      const body: ErrorResponse = {
        statusCode: status,
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details
      };
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ErrorResponse = {
        statusCode: status,
        errorCode: ERROR_CODES.ERROR_INTERNO,
        message: exception.message,
        details: null
      };
      response.status(status).json(body);
      return;
    }

    const message =
      exception instanceof Error
        ? exception.message
        : "Error interno del servidor.";
    const body: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ERROR_CODES.ERROR_INTERNO,
      message,
      details: null
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
