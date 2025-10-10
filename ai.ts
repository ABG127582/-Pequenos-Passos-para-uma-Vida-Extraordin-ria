// ai.ts
// This module centralizes all interactions with the Google GenAI API.

import { GoogleGenAI } from "@google/genai";
import { errorHandler } from './errorHandler';
import { loadingManager } from './loadingManager';

// Initialize the Gemini API client.
// The API key is sourced from environment variables, managed by the Vite build process.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
