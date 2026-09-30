import { generateOpenGraphImage } from "astro-og-canvas";
import { ogCardConfig } from "./_og-card-config";

export const prerender = true;

export async function GET() {
  const body = await generateOpenGraphImage({
    title: "Meta42",
    description: "调研 · 深度思考 · 认知",
    ...ogCardConfig,
  });
  return new Response(body, { headers: { "Content-Type": "image/png" } });
}
