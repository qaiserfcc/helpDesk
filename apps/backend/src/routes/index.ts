import { Router } from 'express';

const router = Router();

router.get('/version', (_req, res) => {
  res.json({
    service: 'helpdesk-backend',
    version: '0.1.0'
  });
});

export default router;
