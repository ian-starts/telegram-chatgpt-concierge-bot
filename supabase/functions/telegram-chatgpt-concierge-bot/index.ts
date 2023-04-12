// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { Telegraf } from "telegraf";
import { downloadVoiceFile } from "../lib/downloadVoiceFile.ts";
import { postToWhisper } from "../lib/postToWhisper.ts";
import { textToSpeech } from "../lib/htApi.ts";
import { createReadStream, existsSync, mkdirSync } from "fs";
import { Model as ChatWithTools } from "../models/chatWithTools.ts";

const workDir = "./tmp";
const telegramToken = Deno.env.get(TELEGRAM_TOKEN!);

const bot = new Telegraf(telegramToken);
let model = new ChatWithTools();

if (!existsSync(workDir)) {
  mkdirSync(workDir);
}

bot.start((ctx) => {
  ctx.reply("Welcome to my Telegram bot!");
});

bot.help((ctx) => {
  ctx.reply("Send me a message and I will echo it back to you.");
});

bot.on("voice", async (ctx) => {
  const voice = ctx.message.voice;
  await ctx.sendChatAction("typing");

  let localFilePath;

  try {
    localFilePath = await downloadVoiceFile(workDir, voice.file_id, bot);
  } catch (error) {
    console.log(error);
    await ctx.reply(
        "Whoops! There was an error while downloading the voice file. Maybe ffmpeg is not installed?"
    );
    return;
  }

  const transcription = await postToWhisper(model.openai, localFilePath);

  await ctx.reply(`Transcription: ${transcription}`);
  await ctx.sendChatAction("typing");

  let response;
  try {
    response = await model.call(transcription);
  } catch (error) {
    console.log(error);
    await ctx.reply(
        "Whoops! There was an error while talking to OpenAI. See logs for details."
    );
    return;
  }

  console.log(response);

  await ctx.reply(response);

  try {
    const responseTranscriptionPath = await textToSpeech(response);
    await ctx.sendChatAction("typing");
    await ctx.replyWithVoice({
      source: createReadStream(responseTranscriptionPath),
      filename: localFilePath,
    });
  } catch (error) {
    console.log(error);
    await ctx.reply(
        "Whoops! There was an error while synthesizing the response via play.ht. See logs for details."
    );
  }
});

bot.on("message", async (ctx) => {
  const text = (ctx.message as any).text;

  if (!text) {
    ctx.reply("Please send a text message.");
    return;
  }

  console.log("Input: ", text);

  await ctx.sendChatAction("typing");
  try {
    const response = await model.call(text);

    await ctx.reply(response);
  } catch (error) {
    console.log(error);

    const message = JSON.stringify(
        (error as any)?.response?.data?.error ?? "Unable to extract error"
    );

    console.log({ message });

    await ctx.reply(
        "Whoops! There was an error while talking to OpenAI. Error: " + message
    );
  }
});

process.on("SIGTERM", () => {
  bot.stop();
});

serve(async (req) => {
  bot.webhookCallback(bot.secretPathComponent())
})

