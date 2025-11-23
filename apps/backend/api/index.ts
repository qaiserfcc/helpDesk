import type { IncomingMessage, ServerResponse } from 'http';
import app from '../src/app';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Delegate to the Express instance so we can reuse middleware/routes.
  return app(req as any, res as any);
}
