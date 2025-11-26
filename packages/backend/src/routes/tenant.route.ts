import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes';

const router = Router();

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
  } catch (error: any) {}
});

export default router;
