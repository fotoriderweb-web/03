import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

// --- OpenAI ---
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- ROOT ---
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

    // --- DETECCIÓN ---
    const identify = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Return ONLY valid JSON. Identify brand, model and confidence. " +
                "Do NOT include markdown. Format: {\"brand\":\"\",\"model\":\"\",\"confidence\":0}"
            },
            { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}` }
          ]
        }
      ]
    });

    // Extraer texto garantizado sin markdown
    const rawIdentify = identify.output[0].content[0].text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const info = JSON.parse(rawIdentify);

    // --- PRECIOS ---
    const priceCall = await client.responses.create({
      model: "gpt-4.1",
      input: [
        `Return ONLY JSON. Give estimated new_price and used_price in euros for the watch: ${info.brand} ${info.model}. Format: {"new_price":0,"used_price":0}`
      ]
    });

    const rawPrice = priceCall.output[0].content[0].text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const price = JSON.parse(rawPrice);

    res.json({
      brand: info.brand,
      model: info.model,
      confidence: info.confidence,
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
