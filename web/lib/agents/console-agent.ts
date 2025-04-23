// import { AgentConfig, ChatMessage } from "../types";
// import { BaseLLM } from "../llm/llm";

// export class TerminalAgent {
//   llm: BaseLLM;
//   config: AgentConfig;
//   constructor(llm: BaseLLM, config: AgentConfig) {
//     this.llm = llm;
//     this.config = config;
//   }

//   getPrompt(userMessage: ChatMessage, viewContent: string) {
//     const prompt = this.config.prompt
//       .replace("{userMessage}", userMessage.content)
//       .replace("{viewContent}", viewContent);
//     return prompt;
//   }

//   async generateAgentCompletion(
//     userMessage: ChatMessage,
//     viewContent: string,
//     signal?: AbortSignal,
//   ): Promise<string> {
//     const prompt = this.getPrompt(userMessage, viewContent);
//     return this.llm.generate(prompt, signal);
//   }
// }
