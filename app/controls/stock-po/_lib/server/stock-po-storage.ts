import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.resolve(
    process.env.STOCK_PO_UPLOAD_DIR ||
    path.join(process.cwd(), "storage", "stock-po-validations"),
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
        throw new Error("Chemin de fichier invalide");
    }
    return resolved;
}

export async function saveLocalValidationFile(
    poId: number,
    file: File,
): Promise<{ relativePath: string; fileName: string; mimeType: string }> {
    const ext = EXT_BY_MIME[file.type] ?? "bin";
    const poDir = String(poId);
    const diskName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const relativePath = path.join(poDir, diskName);
    const absolutePath = assertInsideRoot(relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    return {
        relativePath: relativePath.replace(/\\/g, "/"),
        fileName: file.name || `validation-${poId}.${ext}`,
        mimeType: file.type,
    };
}

export async function readLocalValidationFile(
    relativePath: string,
): Promise<Buffer | null> {
    try {
        const absolutePath = assertInsideRoot(relativePath);
        return await fs.readFile(absolutePath);
    } catch {
        return null;
    }
}

export async function deleteLocalValidationFile(
    relativePath: string | null | undefined,
): Promise<void> {
    if (!relativePath) return;
    try {
        const absolutePath = assertInsideRoot(relativePath);
        await fs.unlink(absolutePath);
    } catch {
        // Fichier déjà absent : silencieux
    }
}