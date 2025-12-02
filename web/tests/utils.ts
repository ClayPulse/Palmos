import { jest } from "@jest/globals";
import dotenv from "dotenv";
import https from "https";
import fetch from "node-fetch";

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export function createMockFetchAPI() {
  // Mock fetchAPI to call the real API
  jest.unstable_mockModule("@/lib/pulse-editor-website/backend", () => ({
    fetchAPI: async (url: string, options: any) => {
      // Create an agent that trusts the certificate
      const agent = new https.Agent({ rejectUnauthorized: false });

      const webUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`;
      return fetch(webUrl, { ...options, agent });
    },
  }));
}
