import { BaseLLM } from "../llm/llm";
import { BaseSTT } from "../stt/stt";
import { BaseTTS } from "../tts/tts";

export class AIModelConfig {
  // --- Speech-to-Text ---
  sttModel: BaseSTT | undefined;
  // --- Language Model ---
  llmModel: BaseLLM | undefined;
  // --- Text-to-Speech ---
  ttsModel: BaseTTS | undefined;

  constructor() {
    this.sttModel = undefined;
    this.llmModel = undefined;
    this.ttsModel = undefined;
  }

  public setSTTModel(model: BaseSTT) {
    this.sttModel = model;
  }

  public setLLMModel(model: BaseLLM) {
    this.llmModel = model;
  }

  public setTTSModel(model: BaseTTS) {
    this.ttsModel = model;
  }

  public getSTTModel() {
    return this.sttModel;
  }

  public getLLMModel() {
    return this.llmModel;
  }

  public getTTSModel() {
    return this.ttsModel;
  }
}
