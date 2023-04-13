// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import {serve} from "https://deno.land/std@0.168.0/http/server.ts"

import {Bot, webhookCallback} from 'https://deno.land/x/grammy/mod.ts'
import {Model as ChatWithTools} from "./models/chatWithTools.ts";

const telegramToken = Deno.env.get('TELEGRAM_TOKEN')!;

const bot = new Bot(telegramToken)
let model = new ChatWithTools();

bot.command("start", (ctx) => {
    ctx.reply("Welcome to my Telegram bot!");
});

bot.command("help", (ctx) => {
    ctx.reply("Send me a message and I will echo it back to you.");
});

bot.command("message", async (ctx) => {
    const text = (ctx.message as any).text;

    if (!text) {
        ctx.reply("Please send a text message.");
        return;
    }

    console.log("Input: ", text);

    // await ctx.sendChatAction("typing");
    try {
        const response = await model.call(text);

        await ctx.reply(response);
    } catch (error) {
        console.log(error);

        const message = JSON.stringify(
            (error as any)?.response?.data?.error ?? "Unable to extract error"
        );

        console.log({message});

        await ctx.reply(
            "Whoops! There was an error while talking to OpenAI. Error: " + message
        );
    }
});
const handleUpdate = webhookCallback(bot, 'std/http')

serve(async (req) => {
    try {
        return await handleUpdate(req)
    } catch (err) {
        console.error(err)
    }
})