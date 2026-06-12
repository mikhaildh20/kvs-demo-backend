import CryptoJS from "crypto-js";

const getUrlSecret = () => {
  const secret =
    process.env.URL_ID_SECRET ||
    process.env.PORTAL_KEY ||
    process.env.NEXT_PUBLIC_KEY;

  if (!secret) {
    throw new Error("URL_ID_SECRET is not set");
  }

  return secret;
};

export const decryptIdUrl = (encryptedText) => {
  if (!encryptedText) return null;

  try {
    let encrypted = encryptedText.replaceAll("-", "+").replaceAll("_", "/");

    while (encrypted.length % 4) {
      encrypted += "=";
    }

    const decrypted = CryptoJS.AES.decrypt(encrypted, getUrlSecret());
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    return decryptedText || null;
  } catch {
    return null;
  }
};
