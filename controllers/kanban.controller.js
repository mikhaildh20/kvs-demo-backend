import { KanbanService } from "../services/kanban.service.js";
import { error, success } from "../response/DtoResponse.js";
import { KanbanModel } from "../models/kanban.model.js";

const getKanbanImportErrorMessage = (err) => {
    const message = String(err?.message || "");
    const lower = message.toLowerCase();

    if (lower.includes("missing required column")) {
        return message;
    }

    if (lower.includes("excel a") && lower.includes("excel b") && lower.includes("required")) {
        return "Excel A and Excel B are required";
    }

    if (lower.includes("no matching data")) {
        return "No matching data was found between Excel A and Excel B. Check the item codes in both files.";
    }

    if (
        lower.includes("invalid file") ||
        lower.includes("zip") ||
        lower.includes("worksheet") ||
        lower.includes("end of central directory")
    ) {
        return "The Excel file could not be read. Make sure you upload a valid .xlsx template.";
    }

    if (
        lower.includes("prisma") ||
        lower.includes("constraint") ||
        lower.includes("stack") ||
        lower.includes("trace") ||
        message.length > 140
    ) {
        return "Failed to import kanban data. Check the Excel content and try again.";
    }

    return message || "Failed to import kanban data. Check the Excel files and try again.";
};

export const KanbanController = {
    async importKanban(req, res){
        try{
            const {fileA, fileB} = req.files || {};
            const data = await KanbanService.processKanbanImport(fileA?.[0], fileB?.[0]);
            return res.json(success(data, "Kanban data imported successfully"));
        }catch(err){
            return res.status(400).json(error(getKanbanImportErrorMessage(err)));
        }
    },

    async getAll(req, res){
        try{
            const data = await KanbanService.getAll(req.query);
            return res.json(success(data));
        }catch(err){
            return res.status(500).json(error(err.message));
        }
    },

    async getById(req, res){
        try{
            const data = await KanbanService.getById(req.params.id);
            return res.json(success(data));
        }catch (err){
            return res.status(400).json(error(err.message));
        }
    },

    async create(req, res){
        try{
            const data = await KanbanService.create(req.body, req.user.fullname);
            return res.status(201).json(success(data, "Kanban created"));
        }catch(err){
            return res.status(400).json(error(err.message));
        }
    },

    async update(req, res){
        try{
            const data = await KanbanService.update(req.params.id, req.body, req.user.fullname);
            return res.json(success(data, "Kanban updated"));
        }catch(err){
            return res.status(400).json(error(err.message));
        }
    },

    async toggleStatus(req, res){
        try{
            const data = await KanbanService.toggleStatus(req.body.id, req.user.fullname);
            return res.json(success(data, "Kanban status updated successfully"));
        }catch(err){
            return res.status(400).json(error(err.message));
        }
    },

    async toggleSpecial(req, res){
        try{
            const data = await KanbanService.toggleSpecial(req.body.id, req.user.fullname);
            return res.json(success(data, "Special kanban updated successfully"));
        }catch(err){
            return res.status(400).json(error(err.message));
        }
    },

    async getDropdownList(req, res) {
        try {
            const data = await KanbanService.getDropdownList(); 
            return res.json(
                success(data)
            );

        } catch (err) {

            return res.status(500).json(
                error(err.message)
            );
        }
    },

    async getDropdownListPartNumber(req, res){
        try{
            const data = await KanbanService.getDropdownListPartNumber(req.body.Id); 
            return res.json(success(data));
        }catch (err){
            return res.status(500).json(
                error(err.message)
            );
        }
    }
}
