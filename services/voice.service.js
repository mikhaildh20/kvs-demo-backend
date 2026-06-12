import fs from "fs";
import path from "path";
import gTTS from "gtts";

export const generateVoiceFile = async (
    text,
    folder = "sc_voice"
) => {
    if (!text) {
        throw new Error(
            "Text is required"
        );
    }

    const allowedFolders = [
        "sc_voice",
        "lc_voice",
    ];

    if (
        !allowedFolders.includes(folder)
    ) {
        throw new Error(
            "Invalid folder"
        );
    }

    // 🔥 CREATE FOLDER
    const uploadDir = path.join(
        "uploads",
        folder
    );

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
            recursive: true,
        });
    }

    // 🔥 GENERATE FILE NAME
    const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.mp3`;

    const filePath = path.join(
        uploadDir,
        fileName
    );

    // 🔥 CREATE TTS
    const tts = new gTTS(
        text,
        "id"
    );

    // 🔥 SAVE MP3
    await new Promise(
        (resolve, reject) => {
            tts.save(
                filePath,
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        }
    );

    // 🔥 RETURN PUBLIC PATH
    return filePath.replace(
        /\\/g,
        "/"
    );
};