import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Define templates with const assertion for type safety
const LANDING_PAGE_TEMPLATES = {
  basic: `Basic landing page with header, hero section, features, and footer`,
  modern: `Modern landing page with gradient backgrounds, animated buttons, and card components`,
  saas: `SaaS product page with pricing tables, testimonials, and feature comparison`,
} as const;

type TemplateKey = keyof typeof LANDING_PAGE_TEMPLATES;

interface ChatRequest {
  messages: { role: string; content: string }[];
  template?: TemplateKey;
}

export async function POST(request: Request) {
  try {
    const { messages, template = "basic" } =
      (await request.json()) as ChatRequest;

    // Initialize the Google Generative AI
    const genAI = new GoogleGenerativeAI(
      "AIzaSyCJxky_q1feJHqAhf4wleHL4lIlB26zM6Y"
    );

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        topK: 32,
        maxOutputTokens: 4096,
      },
    });

    // Enhanced system prompt
    const systemPrompt = `
      You are an expert web developer specializing in creating modern, responsive landing pages.
      Follow these guidelines strictly:
      
      1. Always return complete, production-ready HTML and CSS code
      2. Use semantic HTML5 and modern CSS (Flexbox/Grid)
      3. Make it fully responsive (mobile-first approach)
      4. Include all necessary meta tags and viewport settings
      5. Structure code with these sections:
         - Header with navigation
         - Hero section
         - Key features/benefits
         - Call-to-action
         - Footer
      
      6. Format code blocks with clear markers:
         - \`\`\`html for HTML
         - \`\`\`css for CSS
      
      7. Current template style: ${LANDING_PAGE_TEMPLATES[template]}
      
      8. Include brief explanations before each code block
    `;

    // Prepare chat history
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [
          {
            text:
              "Understood! I'll create professional landing pages with:\n" +
              "- Clean, well-commented code\n" +
              "- Mobile-responsive design\n" +
              "- Properly formatted code blocks\n" +
              "- All necessary sections\n" +
              `Following the ${template} template style`,
          },
        ],
      },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
    ];

    // Start chat session
    const chat = model.startChat({
      history: chatHistory,
    });

    // Get the latest user message
    const userMessage = messages[messages.length - 1].content;

    // Send message and await response
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const text = response.text();

    // Post-process the response to ensure proper formatting
    const processedResponse = text.replace(
      /```(html|css)/g,
      "```$1\n" // Ensure newline after code block markers
    );

    return NextResponse.json({
      response: processedResponse,
      metadata: {
        templateUsed: template,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        message: "Error processing your request",
        error: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Please try again with a more specific request",
      },
      { status: 500 }
    );
  }
}
