import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import { KanbanController } from '../controllers/kanban.controller.js';

const router = express.Router();
const importUpload = upload.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 },
]);

router.post('/import', (req, res, next) => {
    importUpload(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                data: null,
                error: true,
                message: err.code === "LIMIT_FILE_SIZE"
                    ? "The Excel file is too large. Maximum file size is 25 MB."
                    : err.message,
            });
        }

        return next();
    });
}, KanbanController.importKanban);
router.get("/", KanbanController.getAll);
router.get(
    "/dropdown-list",
    KanbanController.getDropdownList
);
router.post("/dropdown-list-part-number", KanbanController.getDropdownListPartNumber);
router.get("/:id", KanbanController.getById);
router.post("/", KanbanController.create);
router.put("/:id", KanbanController.update);
router.post("/toggle-status", KanbanController.toggleStatus);
router.post("/toggle-special", KanbanController.toggleSpecial);


export default router;
