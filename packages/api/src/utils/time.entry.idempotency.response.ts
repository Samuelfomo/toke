import { Response } from 'express';
import { TIME_ENTRIES_CODES, TIME_ENTRIES_ERRORS, TIME_ENTRIES_MESSAGES } from '@toke/shared';

import R from '../tools/response.js';

import type { TimeEntryIdempotentReplay } from './time.entry.idempotency.js';

export const respondToTimeEntryIdempotentReplay = async (
  res: Response,
  replay: TimeEntryIdempotentReplay,
) => {
  if (!replay.matches) {
    return R.handleError(res, 409, {
      code: TIME_ENTRIES_CODES.EXTERNAL_ID_CONFLICT,
      message: TIME_ENTRIES_ERRORS.EXTERNAL_ID_CONFLICT,
    });
  }

  return R.handleSuccess(res, {
    message: TIME_ENTRIES_MESSAGES.IDEMPOTENT_REPLAY,
    entry: await replay.entry.toJSON(),
    idempotent_replay: true,
  });
};
