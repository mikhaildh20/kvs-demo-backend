import { generateVoiceFile } from "../services/voice.service.js";
import { error, success } from '../response/DtoResponse.js';

export const VoiceController = {
   async generate(req, res) {
      try {
         const {
            text,
            folder,
         } = req.body;

         if (!text) {
            return res.status(400).json(
               error("Text is required")
            );
         }

         const result =
            await generateVoiceFile(
               text,
               folder
            );

         return res.json(
            success(
               result,
               "Voice generated successfully"
            )
         );
      } catch (err) {
         return res.status(500).json(
            error(err.message)
         );
      }
   }
};