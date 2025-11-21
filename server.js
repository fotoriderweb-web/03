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
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Identify the brand and model of this watch. Return JSON { brand, model, confidence }"
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ]
    });

    const detectText = response.output_text;
    const result = JSON.parse(detectText);

    // --- 2) Buscar precio ---
    const priceRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Return approximate new_price and used_price in euros for this watch: ${result.brand} ${result.model} as JSON`
    });

    const priceText = priceRes.output_text;
    const price = JSON.parse(priceText);

    res.json({
      ...result,
      new_price: price.new_price || null,
      used_price: price.used_price || null
    });

  } catch (err) {
    console.error("BACKEND ERROR:", err);
    res.status(500).json({ error: "OpenAI API error", details: err.message });
  }
});

// ---- START ----
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
