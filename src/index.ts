import { AppServer, AppSession } from "@mentra/sdk";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

class CodeWordsAIChatApp extends AppServer {
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    console.log(`[Session] Neue Session: ${sessionId} fuer User: ${userId}`);
    this.conversationHistory.set(sessionId, []);

    session.layouts.showTextWall(
      "CodeWords AI\n\nBereit! Sprich einfach mit mir."
    );

    session.events.onTranscription(async (data) => {
      if (!data.isFinal) return;
      const userMessage = data.text.trim();
      if (!userMessage) return;

      console.log(`[Transkription] User ${userId}: "${userMessage}"`);
      const history = this.conversationHistory.get(sessionId) || [];
      session.layouts.showTextWall(`Du: ${userMessage}\n\nDenke nach...`);
      history.push({ role: "user", content: userMessage });

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Du bist ein hilfreicher KI-Assistent auf Even Realities G1 Smart Glasses. " +
                "Antworte sehr kurz (maximal 2-3 kurze Saetze), da der Text auf kleinen Brillenglaesern angezeigt wird. " +
                "Sei praezise, direkt und hilfreich.",
            },
            ...history.slice(-6),
          ],
          max_tokens: 150,
          temperature: 0.7,
        });

        const aiResponse =
          completion.choices[0]?.message?.content || "Keine Antwort erhalten.";
        console.log(`[AI] Session ${sessionId}: "${aiResponse}"`);

        history.push({ role: "assistant", content: aiResponse });
        if (history.length > 10) history.splice(0, 2);
        this.conversationHistory.set(sessionId, history);

        session.layouts.showTextWall(`Du: ${userMessage}\n\nAI: ${aiResponse}`);
      } catch (error) {
        console.error(`[Error] OpenAI call failed:`, error);
        session.layouts.showTextWall(
          "Fehler beim AI-Aufruf.\nBitte versuche es erneut."
        );
      }
    });
  } // ← schließt onSession
} // ← schließt CodeWordsAIChatApp

process.env.HOST = "0.0.0.0";
process.env.HOSTNAME = "0.0.0.0";
const railwayPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = new CodeWordsAIChatApp({
  packageName: process.env.PACKAGE_NAME || "com.player.codewords-ai-chat",
  apiKey: process.env.MENTRA_API_KEY || "",
  port: railwayPort,
  hostname: "0.0.0.0",
  serverUrl: "https://g1-ai-chat-production.up.railway.app",
});

try {
  app.start();
  console.log(`CodeWords AI Chat laeuft auf Port ${railwayPort}`);
} catch (err) {
  console.error("Critical error on start:", err);
}
