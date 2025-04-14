import Constants from "@/data/Constants";
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";  // Enable Edge Functions (supports streaming)
export const maxDuration = 60;  // Vercel Hobby plan limit

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_AI_API_KEY,
});

export async function POST(req: NextRequest) {
    const { model, description, imageUrl } = await req.json();

    const ModelObj = Constants.AiModelList.find(item => item.name == model);
    const modelName = ModelObj?.modelName ?? 'google/gemini-2.0-pro-exp-02-05:free';

    const response = await openai.chat.completions.create({
        model: modelName,
        stream: true,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: description },
                    { type: "image_url", image_url: { url: imageUrl } }
                ],
            },
        ],
    });

    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of response) {
                const text = chunk.choices?.[0]?.delta?.content || "";
                controller.enqueue(new TextEncoder().encode(text));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}