import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// ---- OpenAI ----
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ---- RUTA PRINCIPAL ----
app.get("/", (req, res) => {
  res.json({ ok: true, service: "RelojDetector backend" });
});

// ---- IDENTIFICAR RELOJ ----
app.post("/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image received" });
    }

    const imageBase64 = req.file.buffer.toString("base64");

    // --- 1) Identificación del reloj ---
    const identify = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the brand, model and confidence of this watch. Return JSON { brand, model, confidence }" },
            { type: "image_url", image_url: `data:image/jpeg;base64,${imageBase64}` }
          ]
        }
      ]
    });

    const result = JSON.parse(identify.choices[0].message.content);

    // --- 2) Buscar precio ---
    const price = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Return approximate JSON { new_price, used_price } for this watch in euros: ${result.brand} ${result.model}`
        }
      ]
    });

    const priceResult = JSON.parse(price.choices[0].message.content);

    res.json({
      brand: result.brand || null,
      model: result.model || null,
      confidence: result.confidence || null,
      new_price: priceResult.new_price || null,
      used_price: priceResult.used_price || null
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "OpenAI API error", details: err.message });
  }
});

// ---- START ----
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
