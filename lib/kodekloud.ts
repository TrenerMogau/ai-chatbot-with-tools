import { createOpenAI } from "@ai-sdk/openai"

/* 
This client provides access to the kodekloud AI gateway
specify the api endpoint and the api key to access the models
*/
export const kodekloudClient = createOpenAI({
  baseURL: process.env.KODEKLOUD_BASE_URL || "https://api.ai.kodekloud.com/v1",
  apiKey: process.env.KODEKLOUD_API_KEY,
})
