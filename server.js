import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- Limpia respuestas para que siempre sean JSON ---
function cleanJSON(text) {
  if (!text) return "{}";

  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^[^{]+/, "")   // Quita todo antes de la primera {
    .replace(/[^}]+$/, "")   // Quita todo después de la última }
    .trim();
}

// --- Ruta principal ---
app.get("/", (req, res) => {
  res.json({ ok: true, service: "RelojDetector backend" });
});

// --- IDENTIFY ---
app.post("/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image received" });
    }

    const imageBase64 = req.file.buffer.toString("base64");

    // --- 1) IDENTIFICAR ---
    const identify = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Identify the watch brand and model. Return ONLY JSON: {\"brand\":\"...\",\"model\":\"...\",\"confidence\":0.xx}"
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ]
    });

    let rawIdentify = identify.output[0]?.content[0]?.text || "{}";
    rawIdentify = cleanJSON(rawIdentify);

    const watch = JSON.parse(rawIdentify);

    const brand = watch.brand || "Unknown";
    const model = watch.model || "Unknown";

    // --- 2) PRECIOS ---
    const pricing = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Give approximate NEW and USED EUR prices for the watch ${brand} ${model}. Return ONLY JSON {"new_price":"...","used_price":"..."}`
            }
          ]
        }
      ]
    });

    let rawPrice = pricing.output[0]?.content[0]?.text || "{}";
    rawPrice = cleanJSON(rawPrice);

    const price = JSON.parse(rawPrice);

    res.json({
      brand,
      model,
      confidence: watch.confidence || null,
      new_price: price.new_price || null,
      used_price: price.used_price || null
    });

  } catch (err) {
    console.error("Error en /identify:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

// --- START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend corriendo en puerto", PORT));
