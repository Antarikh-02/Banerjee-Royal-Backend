import { Response, Request, NextFunction } from 'express';
import { UnauthorizedError } from 'express-jwt';

import { ResponseHelper, HttpStatusCode } from '@app/helper';
import { EmptyFileError } from '@app/common/error';

export default class ErrorMiddleware {
  public static handle(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof UnauthorizedError) {
      logger.warn(`Authentication with JWT failed due to ${err.message}`);
      ResponseHelper.send(res, HttpStatusCode.UNAUTHORIZED);
    } else if (err instanceof SyntaxError) {
      logger.warn(`Malformed JSON due to ${err.message}`);
      ResponseHelper.send(res, HttpStatusCode.BAD_REQUEST, [err.message]);
    } else {
      logger.error(`Internal Server error due to ${err.message}`);
      ResponseHelper.send(
        res,
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        EnvUtil.isDevelopment() ? err.stack : undefined
      );
    }
  }
}