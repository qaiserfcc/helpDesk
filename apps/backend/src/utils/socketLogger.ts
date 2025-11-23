import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const SOCKET_LOG_FILE = path.join(LOG_DIR, "socket-errors.log");
let prepared = false;

async function ensureLogFile() {
  if (prepared) {
    return;
  }
  await mkdir(LOG_DIR, { recursive: true });
  prepared = true;
}

export async function logSocketFailure(
  context: string,
  detail: string,
  meta?: Record<string, unknown>,
) {
  const lineObject: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    context,
    detail,
  };

  if (meta && Object.keys(meta).length > 0) {
    lineObject.meta = meta;
  }

  try {
    await ensureLogFile();
    await appendFile(
      SOCKET_LOG_FILE,
      `${JSON.stringify(lineObject)}\n`,
      "utf8",
    );
  } catch (error) {
    console.error(
      "[socket] failed to persist log",
      error instanceof Error ? error.message : error,
    );
  }
}
