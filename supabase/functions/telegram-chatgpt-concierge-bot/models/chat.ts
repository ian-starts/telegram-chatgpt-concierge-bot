import { Tool } from "https://esm.sh/langchain/agents";
import { ChatOpenAI } from "chat_models";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "https://esm.sh/langchain/prompts";
import { BufferMemory } from "https://esm.sh/langchain/memory";
import { ConversationChain } from "https://esm.sh/langchain/chains";
import { Configuration, OpenAIApi } from "https://esm.sh/openai";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const params = {
  verbose: true,
  temperature: 1,
  openAIApiKey,
  modelName: Deno.env.get(OPENAI_MODEL) ?? "gpt-4",
  maxConcurrency: 1,
  maxTokens: 1000,
  maxRetries: 5,
};

export class Model {
  public tools: Tool[] = [];
  public chain: ConversationChain;
  public openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: openAIApiKey,
    });

    this.openai = new OpenAIApi(configuration);
    const model = new ChatOpenAI(params, configuration);

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know."
      ),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);

    this.chain = new ConversationChain({
      memory: new BufferMemory({ returnMessages: true }),
      prompt: chatPrompt,
      llm: model,
    });
  }

  public async call(input: string) {
    const output = await this.chain.call({ input });
    return output.output;
  }
}
