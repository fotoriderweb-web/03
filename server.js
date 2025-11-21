import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// Inicializa OpenAI con tu API Key desde variables de entorno
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- Endpoint para analizar imagen ----
app.post("/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ninguna imagen." });
    }

    // Convertimos la imagen a Base64
    const imageBase64 = req.file.buffer.toString("base64");

    // Llamada a OpenAI (ejemplo: genera respuesta sobre la imagen)
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: `Analiza esta imagen: ${imageBase64}`,
        },
      ],
    });

    // Obtenemos el texto de la respuesta
    let text = response.output_text || "";

    // Limpiamos posibles ```json y ``` de la respuesta
    text = text.replace(/```json|```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text); // Intentamos parsear JSON
    } catch (parseError) {
      // Si no es JSON válido, devolvemos como texto
      data = { text };
    }

    res.json({ result: data });
  } catch (err) {
    console.error("Error en /identify:", err);

    // Manejo de errores específicos de OpenAI
    if (err.code === "insufficient_quota") {
      return res.status(429).json({ error: "Se ha excedido la cuota de OpenAI." });
    }

    res.status(500).json({
      error: "Ocurrió un error procesando la imagen. Intenta de nuevo más tarde.",
    });
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
