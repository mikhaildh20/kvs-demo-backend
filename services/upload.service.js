import fs from "fs";
import path from "path";

export const saveFile = (file, folder = "default") => {
    if (!file) return null;

    const allowedFolders = [
        "logo",
        "ikwc",
        "lc_voice",
        "logistic_check",
        "sc_voice",
        "sequence_check"
    ];

    if (!allowedFolders.includes(folder)) {
        throw new Error("Invalid folder");
    }

    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = new Set([
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".pdf",
        ".xlsx",
        ".mp3",
    ]);

    if (!allowedExtensions.has(ext)) {
        throw new Error("Unsupported file type");
    }

    const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}${ext}`;

    const uploadDir = path.join("uploads", folder);

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const newPath = path.join(uploadDir, fileName);

    fs.renameSync(file.path, newPath);

    return newPath.replace(/\\/g, "/");
};