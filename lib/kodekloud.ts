import { createOpenAI } from "@ai-sdk/openai"

/* 
This client provides access to the kodekloud AI gateway
specify the api endpoint and the api key to access the models
*/
export const kodekloudClient = createOpenAI({
  baseURL: process.env.KODEKLOUD_BASE_URL,
  apiKey: process.env.KODEKLOUD_API_KEY,
})
