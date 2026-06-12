import { MatrixService } from "../services/matrix.service.js";
import { error, success } from "../response/DtoResponse.js";

export const MatrixController = {
  async getAll(req, res) {
    try {
      const data = await MatrixService.getAll();
      res.json(success(data));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  },

  async generateLot(req, res) {
        try {

            const data =
                await MatrixService.generateLot();

            res.json(success(data));

        } catch (err) {

            res.status(500).json(
                error(err.message)
            );
        }
    },
};
