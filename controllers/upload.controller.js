import { saveFile } from '../services/upload.service.js';
import { error, success } from '../response/DtoResponse.js';

export const UploadController = {
    async uploadFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json(
                    error("No file uploaded")
                );
            }

            const folder = req.body.folder || "default";

            const result = await saveFile(req.file, folder);

            return res.json(
                success(result, "File uploaded successfully")
            );
        } catch (err) {
            return res.status(500).json(
                error(err.message)
            );
        }
    },
};