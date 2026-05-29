import fs from "fs";
import pdfParse from "pdf-parse-new";
import Groq from "groq-sdk";
import { appConfig } from "../config/app.config";
import https from "https";
import http from "http";
import path from "path";
import os from "os";

const groq = new Groq({ apiKey: appConfig.GROQ_API_KEY });

const downloadImageFromUrl = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `prescription_${Date.now()}.jpg`);
    const file = fs.createWriteStream(tmpFile);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmpFile); });
    }).on("error", (err) => { fs.unlink(tmpFile, () => {}); reject(err); });
  });
};

export async function extractTextFromImage(imagePathOrUrl: string): Promise<string> {
  let imagePath = imagePathOrUrl;
  let isTemp = false;

  if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://")) {
    console.log("Downloading image from Cloudinary...");
    imagePath = await downloadImageFromUrl(imagePathOrUrl);
    isTemp = true;
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error("File not found");
  }

  console.log("Running Groq Vision OCR...");
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");
  const ext = imagePath.toLowerCase();
  const mimeType = ext.endsWith(".png") ? "image/png" : "image/jpeg";

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: "text",
            text: "Extract all text from this prescription image. Return only the raw text content, preserving the layout as much as possible.",
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const fullText = response.choices[0]?.message?.content || "";

  if (isTemp) fs.unlink(imagePath, () => {});

  console.log(`OCR complete - Text length: ${fullText.length}`);

  if (!fullText || fullText.trim().length < 20) {
    throw new Error("Insufficient text extracted from image");
  }

  return fullText;
}

export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  if (!data.text || data.text.trim().length < 20) {
    throw new Error("Insufficient text extracted from PDF");
  }
  return data.text;
};