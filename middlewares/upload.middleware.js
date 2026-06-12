import multer from "multer";
import path from "path";

const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
    ".xlsx",
    ".mp3",
]);

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "audio/mpeg",
    "audio/mp3",
]);

const upload = multer({
    dest: "temp/",
    limits: {
        fileSize: Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024),
        files: 2,
    },
    fileFilter(req, file, callback) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
            return callback(new Error("Unsupported file type"));
        }
        return callback(null, true);
    },
});

export default upload;
