import { Response } from 'express';
import { HttpStatus } from '@toke/shared';

import { RT } from '../utils/response.model.js';

export default class R {
  /**
   * Handle successful JSON response
   */
  static handleSuccess(
    res: Response,
    structure: object,
    httpCode: number = HttpStatus.SUCCESS,
  ): void {
    res.status(httpCode).json({
      [RT.SUCCESS]: true,
      [RT.DATA]: structure,
    });
  }

  static handleCreated(res: Response, structure: object): void {
    this.handleSuccess(res, structure, HttpStatus.CREATED);
  }

  /**
   * Handle error JSON response
   */
  static handleError(res: Response, httpCode: number, error: object): void {
    res.status(httpCode).json({
      [RT.SUCCESS]: false,
      [RT.ERROR]: error,
      [RT.TIMESTAMP]: new Date().toISOString(),
    });
  }

  static handleNoContent(res: Response): void {
    res.status(HttpStatus.NO_CONTENT).end();
  }
}
