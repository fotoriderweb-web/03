import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const upload = multer();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({ ok: true, service: "RelojDetector backend" });
});

app.post("/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            },
            {
              type: "text",
              text: "Describe qué modelo de reloj aparece."
            }
          ]
        }
      ]
    });

    res.json({
      result: response.output_text
    });

  } catch (error) {
    console.error("ERROR EN /identify:", error);
    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend corriendo en puerto " + PORT));
