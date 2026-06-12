import fs from "fs";
import path from "path";
import https from "https";

const GOOGLE_TTS_HOST = "translate.google.com";

const requestVoice = (text) =>
    new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            ie: "UTF-8",
            q: text,
            tl: "id",
            client: "tw-ob",
        });

        const req = https.get(
            {
                hostname: GOOGLE_TTS_HOST,
                path: `/translate_tts?${params.toString()}`,
                headers: {
                    "User-Agent": "Mozilla/5.0",
                },
                timeout: 10000,
            },
            (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error("Voice provider failed"));
                }

                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            }
        );

        req.on("timeout", () => {
            req.destroy(new Error("Voice provider timeout"));
        });
        req.on("error", reject);
    });

export const generateVoiceFile = async (text, folder = "sc_voice") => {
    const normalizedText = String(text || "").trim();
    if (!normalizedText) {
        throw new Error("Text is required");
    }
    if (normalizedText.length > 200) {
        throw new Error("Text is too long");
    }

    const allowedFolders = ["sc_voice", "lc_voice"];

    if (!allowedFolders.includes(folder)) {
        throw new Error("Invalid folder");
    }

    const uploadDir = path.join("uploads", folder);

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.mp3`;
    const filePath = path.join(uploadDir, fileName);

    const audio = await requestVoice(normalizedText);
    fs.writeFileSync(filePath, audio, { mode: 0o644 });

    return filePath.replace(/\\/g, "/");
};
