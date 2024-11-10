// require('dotenv').config({path:"./env"});
import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
// const { Client, LocalAuth, NoAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
// const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// const ffmpeg = require('fluent-ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegPath);
// const stream = require('stream');

import whatsapp from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import stream from 'stream';
import {
    getInference,
    getRAGResponse,
    generateVideoQuiz,
    generateVideoSummary,
    generateAnswer,
    haveChat,
    haveChatWithRAG
} from "./controllers/genai.controller.js";
ffmpeg.setFfmpegPath(ffmpegPath);

const { Client, LocalAuth, NoAuth } = whatsapp;



dotenv.config(
    {
        path:"./env"
    }
);

connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server started at ${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log("Error Occured while connecting with MongoDB :", error);
})



let user_language = "English";
const languages = ["Hindi", "English", "Marathi", "Punjabi", "Gujarati", "Tamil", "Kannada", "Oriya"];

function getAudioObject(mediaBuffer, mimeType) {
    try {
        if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
            throw new Error('Invalid mediaBuffer. Expected a Buffer.');
        }
        return {
            inlineData: {
                data: mediaBuffer.toString("base64"),
                mimeType
            },
        };
    } catch (error) {
        console.error(`Error processing media: ${error.message}`);
        throw error;
    }
}

async function convertOggToMp3InMemory(oggBuffer) {
    const inputStream = new stream.PassThrough();
    inputStream.end(oggBuffer);

    const outputStream = new stream.PassThrough();
    const mp3Buffer = [];

    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .audioCodec('libmp3lame')
            .format('mp3')
            .on('error', (err) => reject(`Error during conversion: ${err.message}`))
            .on('end', () => resolve(Buffer.concat(mp3Buffer)))
            .pipe(outputStream, { end: true });

        outputStream.on('data', (chunk) => mp3Buffer.push(chunk));
        outputStream.on('end', () => console.log('Conversion to mp3 finished'));
    });
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']  // Puppeteer sandbox options
    }
});
client.once('ready', () => {
    console.log('Client is ready!'.cyan);
});
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});
client.on('message_create', (message) => {
    (async () => {
        try {
            if(message.body.startsWith('!!')){
                const query = message.body.replace(/^!!/, '');
                console.log(query);
                
                const response = await getRAGResponse(query, user_language);
                message.reply(response);
            }
            if(message.body === '!help'){
                client.sendMessage(message.from, "Hello there, Welcome to snapHabit. Please respond with a Language of your choice and if you have any questions related to ECO LifeStyle Analyzer, add '!!' before the question. Thank you!");
            }
            if (message.hasMedia) {
                const media = await message.downloadMedia();
                if (media.mimetype === 'audio/ogg; codecs=opus') {
                    const oggBuffer = Buffer.from(media.data, 'base64');
                    const mp3Buffer = await convertOggToMp3InMemory(oggBuffer);
                    audioParts = [
                        getAudioObject(mp3Buffer, 'audio/mp3'),
                    ];
                    const prompt = "You are an environmental advocate, dedicated to encouraging individuals to make greener, more eco-friendly, and sustainable choices that benefit both their lives and the environment. Your task is to review the title and caption of the data provided in the JSON format, answer the user's question: ${user_query}, and rate how beneficial or harmful the described task is to the environment and to personal well-being. Use only the relevant environmental context provided in: ${pageContents} and avoid drawing from outside information. Regardless of input, provide the answer in the language: ${language}"
                    const response = await getInference([prompt, ...audioParts]);
                    message.reply(response);
                }
            }
            if(languages.includes(message.body)){
                user_language = message.body;
            }
        } catch (err) {
            console.error('Error processing message:', err);
        }
    })();
});
client.initialize();














// import express from "express";
// const app = express();
 
// ( async ()=>  {
//     try {
//         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
//         app.on('error', (error) => {
//             console.log("ERRRRRRR: ", error);
//             throw error
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`Server started at ${process.env.PORT}`);
//         })

//     } catch (error) {
//         console.log("Error Occured while connecting with MongoDB :", error);
//         throw error;
        
        
//     }
// })()