import { Router } from 'express';
import authRouter from './auth.js';

const router = Router();

router.use('/auth', authRouter);

router.get('/version', (_req, res) => {
  res.json({
    service: 'helpdesk-backend',
    version: '0.1.0'
  });
});

export default router;
