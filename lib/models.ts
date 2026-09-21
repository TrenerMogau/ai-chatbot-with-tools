// See https://vercel.com/ai-gateway/models.
export const MODELS = [
  { id: "qwen/qwen3.8-flash", name: "Qwen 3.8 flash" },
  { id: "minimax/MiniMax-M2.5", name: "MiniMax M2.5" },
  { id: "gpt-oss-120b", name: "GPT-OSS 120B" },
  { id: "zai/glm-5.3-flash", name: "GLM 5.3 Flash" },
]

export const DEFAULT_MODEL = MODELS[0].id

export interface GatewayModel {
  id: string
  name: string
}

export function isModelAllowed(id: string) {
  return MODELS.some((model) => model.id === id)
}
