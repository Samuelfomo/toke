export class TokenHelper {

  static async generate(): Promise<string> {
    try {
      const secret: string = import.meta.env.VITE_API_SECRET;
      const key: string = import.meta.env.VITE_API_KEY;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const code = key + timestamp;

      // Convert secret → Uint8Array
      let secretBytes: Uint8Array;

      try {
        // Try base64
        secretBytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
      } catch {
        // Fallback to UTF-8
        secretBytes = new TextEncoder().encode(secret);
      }

      // HMAC key import — with explicit type
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        secretBytes as BufferSource,
        {
          name: "HMAC",
          hash: { name: "SHA-256" }
        } satisfies HmacImportParams,
        false,
        ["sign"]
      );

      // Sign the message
      const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        new TextEncoder().encode(code)
      );

      const bytes = new Uint8Array(signature);
      return btoa(String.fromCharCode(...bytes));

    } catch (error: any) {
      console.error("Token error:", error);
      return "";
    }
  }
}



// import crypto from "crypto";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
//
// import dotenv from "dotenv";
//
//
// // Obtenir le répertoire du fichier courant
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
//
// // Charger .env.local depuis le même dossier que package.json
// dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
//
// const secret = process.env.SECRET;
// const key = process.env.API_KEY;
//
// if (!secret || !key) {
//   console.error("❌ SECRET ou API_KEY manquant dans .env.local");
//   process.exit(1);
// }
//
// const timestamp = Math.floor(Date.now() / 1000).toString();
// const data = key + timestamp;
//
// const secretBytes = Buffer.from(secret, "base64");
//
// const token = crypto
//   .createHmac("sha256", secretBytes)
//   .update(data)
//   .digest("base64");
//
// // Écrire le token dans le dossier du script
// fs.writeFileSync(path.resolve(__dirname, "./token.txt"), token);
//
// console.log("🎉 Token généré :", token);




