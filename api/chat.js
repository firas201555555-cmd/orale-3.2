
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح Gemini غير موجود في إعدادات Vercel."
    });
  }

  try {
    const { history } = req.body || {};

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "اكتب رسالة أولاً." });
    }

    const contents = history.slice(-20).map(item => ({
      role: item.role === "model" ? "model" : "user",
      parts: [{ text: String(item.text || "").slice(0, 8000) }]
    })).filter(item => item.parts[0].text.trim());

    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return res.status(400).json({ error: "آخر رسالة يجب أن تكون من المستخدم." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "تعذر الاتصال بـ Gemini."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("").trim();

    if (!reply) {
      return res.status(502).json({
        error: "لم تصل إجابة من Gemini."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: "حدث خطأ في الخادم. حاول مجددًا."
    });
  }
}
