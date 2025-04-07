import express from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import cors from 'cors';
import { openai } from './openai-setup.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/api/ask', async (req, res) => {
  try {
    const audioFile = req.files.audio;
    const filePath = path.join(__dirname, 'input.wav');
    await audioFile.mv(filePath);

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(filePath),
      response_format: 'text',
      
    });

    const messages = [
      {
        role: 'system',
        content: `You are a gentle, supportive women's health assistant. Keep replies very short (1-2 spoken lines), friendly, and simple. Respond in Urdu or English depending on user input.`
      },
      {
        role: 'user',
        content: transcription
      }
    ];

    let assistantReply = '';
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true
    });

    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || '';
      assistantReply += content;
    }

    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: assistantReply
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    const outPath = path.join(__dirname, 'response.mp3');
    fs.writeFileSync(outPath, buffer);

    res.sendFile(outPath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing voice');
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));