import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.resolve(
    process.env.TRANSFER_UPLOAD_DIR ||
    path.join(process.cwd(), "storage", "inter-store-transfers"),
);

const EXT_BY_MIME: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

function assertInsideRoot(relativePath: string): string {
    const resolved = path.resolve(UPLOAD_ROOT, relativePath);
    if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) {
        throw new Error("Chemin invalide");
    }
    return resolved;
}

export async function saveTransferFile(
    soId: number,
    kind: "dp_out" | "dp_in",
    file: File,
) {
    const ext = EXT_BY_MIME[file.type] ?? "bin";
    const diskName = `${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const relativePath = path.join(String(soId), diskName);
    const abs = assertInsideRoot(relativePath);

    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));

    return {
        relativePath: relativePath.replace(/\\/g, "/"),
        fileName: file.name || `${kind}-${soId}.${ext}`,
        mimeType: file.type,
    };
}

export async function readTransferFile(relativePath: string): Promise<Buffer | null> {
    try {
        return await fs.readFile(assertInsideRoot(relativePath));
    } catch {
        return null;
    }
}

export async function deleteTransferFile(relativePath: string | null | undefined) {
    if (!relativePath) return;
    try {
        await fs.unlink(assertInsideRoot(relativePath));
    } catch {
        /* ignore */
    }
}