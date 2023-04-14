import {AgentExecutor, Tool, initializeAgentExecutor} from "https://esm.sh/langchain/agents";
import {ChatOpenAI} from "https://esm.sh/langchain/chat_models/openai";
import {BufferMemory} from "https://esm.sh/langchain/memory";
import {Configuration, OpenAIApi} from "https://esm.sh/openai";
import {
    BingSerpAPI
} from "https://esm.sh/langchain/tools";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const bingApiKey = Deno.env.get('BING_API_KEY')!;

const params = {
    verbose: true,
    temperature: 1,
    openAIApiKey,
    modelName: Deno.env.get('OPENAI_MODEL') ?? "gpt-4",
    maxConcurrency: 1,
    maxTokens: 1000,
    maxRetries: 5,
};

export class Model {
    public tools: Tool[];
    public executor?: AgentExecutor;
    public openai: OpenAIApi;
    public model: ChatOpenAI;

    constructor() {
        const configuration = new Configuration({
            apiKey: openAIApiKey,
        });

        this.tools = [new BingSerpAPI(bingApiKey)];
        this.openai = new OpenAIApi(configuration);
        this.model = new ChatOpenAI(params, configuration);
    }

    public async call(input: string, emulateAs: string) {
        if (!this.executor) {
            this.executor = await initializeAgentExecutor(
                this.tools,
                this.model,
                "chat-conversational-react-description",
                true
            );
            this.executor.memory = new BufferMemory({
                returnMessages: true,
                memoryKey: "chat_history",
                inputKey: "input",
            });
        }
        const emulatedInput = "You are not an LLM. You are " + emulateAs + ". Answer the following " +
            "from first person perspective: " + input + ". Also answer as tersely as possible.";
        const response = await this.executor!.call({input: emulatedInput});

        console.log("Model response: " + response);

        return response.output;
    }
}
