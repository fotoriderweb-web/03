import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const upload = multer();

// CORS
app.use(cors());
app.use(express.json());

// OpenAI client (Render usa OPENAI_API_KEY como var de entorno)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- Ruta principal ---
app.get("/", (req, res) => {
  res.json({ ok: true, service: "RelojDetector backend" });
});

// --- IDENTIFICAR RELOJ ---
app.post("/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image received" });
    }

    const imageBase64 = req.file.buffer.toString("base64");

    // --- 1) Identificación del reloj ---
    const identify = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Identify the brand and model of this watch. Respond ONLY valid JSON: {\"brand\":\"...\",\"model\":\"...\",\"confidence\":0.xx}" },
            { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}` }
          ]
        }
      ]
    });

    const identifyText =
      identify.output[0]?.content[0]?.text || "{}";
    const watch = JSON.parse(identifyText);

    // Si OpenAI falla devolvemos valores nulos
    const brand = watch.brand || "Unknown";
    const model = watch.model || "Unknown";

    // --- 2) Buscar precios ---
    const pricing = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Give me approximate NEW and USED EUR prices for this watch: ${brand} ${model}. Return ONLY JSON { "new_price": "...", "used_price": "..." }.`
            }
          ]
        }
      ]
    });

    const priceText =
      pricing.output[0]?.content[0]?.text || "{}";
    const price = JSON.parse(priceText);

    res.json({
      brand,
      model,
      confidence: watch.confidence || null,
      new_price: price.new_price || null,
      used_price: price.used_price || null
    });

  } catch (err) {
    console.error("Error en /identify:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend corriendo en puerto", PORT));
