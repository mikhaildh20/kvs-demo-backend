import fs from "fs";
import path from "path";
import https from "https";

const GOOGLE_TTS_HOST = "translate.google.com";
const MAX_VOICE_TEXT_LENGTH = 2000;
const MAX_TTS_CHUNK_LENGTH = 180;

const splitLongText = (text) => {
    const chunks = [];
    let remaining = text.trim();

    while (remaining.length > MAX_TTS_CHUNK_LENGTH) {
        const windowText = remaining.slice(0, MAX_TTS_CHUNK_LENGTH + 1);
        const sentenceBreak = Math.max(
            windowText.lastIndexOf(". "),
            windowText.lastIndexOf("! "),
            windowText.lastIndexOf("? "),
            windowText.lastIndexOf("; "),
            windowText.lastIndexOf(", ")
        );
        const spaceBreak = windowText.lastIndexOf(" ");
        const breakAt = sentenceBreak > 60 ? sentenceBreak + 1 : spaceBreak > 60 ? spaceBreak : MAX_TTS_CHUNK_LENGTH;

        chunks.push(remaining.slice(0, breakAt).trim());
        remaining = remaining.slice(breakAt).trim();
    }

    if (remaining) {
        chunks.push(remaining);
    }

    return chunks;
};

export const splitTextForTts = (text) => splitLongText(String(text || "").trim());

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
    if (normalizedText.length > MAX_VOICE_TEXT_LENGTH) {
        throw new Error(`Text is too long. Maximum ${MAX_VOICE_TEXT_LENGTH} characters.`);
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

    const audioChunks = [];
    for (const chunk of splitTextForTts(normalizedText)) {
        audioChunks.push(await requestVoice(chunk));
    }
    const audio = Buffer.concat(audioChunks);
    fs.writeFileSync(filePath, audio, { mode: 0o644 });

    return filePath.replace(/\\/g, "/");
};
