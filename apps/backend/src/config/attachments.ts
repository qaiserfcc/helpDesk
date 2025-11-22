import fs from "node:fs";
import path from "node:path";

const attachmentsDir = path.resolve(process.cwd(), "tmp/attachments");
fs.mkdirSync(attachmentsDir, { recursive: true });

export { attachmentsDir };
