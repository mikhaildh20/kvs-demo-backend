import { ColorModel } from "../models/color.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
    const decrypted = decryptIdUrl(value);
    const id = Number(decrypted || value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid color id");
    }

    return id;
};

const mapColor = (color) => ({
    Id: color.clr_id,
    Name: color.clr_name,
    Status: color.clr_status,
});

export const ColorService = {
    async getAll(query) {
        const result = await ColorModel.findPaged(query);
        return{
            data: result.data.map(mapColor),
            totalData: result.totalData
        };
    },

    async getById(rawId) {
        const color = await ColorModel.findById(resolveId(rawId));

        if (!color) {
            throw new Error("Color not found");
        }

        return mapColor(color);
    },

    async create(payload, userId) {
        if (!payload.name?.trim()) {
            throw new Error("Color name is required");
        }

        return mapColor(await ColorModel.create(payload, userId));
    },

    async update(rawId, payload, userId) {
        if (!payload.name?.trim()) {
            throw new Error("Color name is required");
        }

        return mapColor(await ColorModel.update(resolveId(rawId), payload, userId));
    },

    async toggleStatus(rawId, userId) {
        return mapColor(await ColorModel.toggleStatus(resolveId(rawId), userId));
    }
};