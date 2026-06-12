import { KanbanService } from "../services/kanban.service.js";
import { error, success } from "../response/DtoResponse.js";
import { KanbanModel } from "../models/kanban.model.js";

export const KanbanController = {
    async importKanban(req, res){
        try{
            const {fileA, fileB} = req.files || {};
            const data = await KanbanService.processKanbanImport(fileA?.[0], fileB?.[0]);
            return res.json(success(data, "Kanban data imported successfully"));
        }catch(err){
            return res.status(400).json(error(err.message));
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
