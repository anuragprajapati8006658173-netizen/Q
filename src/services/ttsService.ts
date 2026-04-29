import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export type VoiceEmotion = 'Normal' | 'Cheerful' | 'Sad' | 'Laughing' | 'Crying' | 'Singing' | 'Whispering' | 'Angry' | 'Village Sweet';

export const EMOTIONS: VoiceEmotion[] = ['Normal', 'Cheerful', 'Sad', 'Laughing', 'Crying', 'Singing', 'Whispering', 'Angry', 'Village Sweet'];

export async function detectEmotion(text: string): Promise<VoiceEmotion> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following text and return ONLY the most appropriate emotion from this list: [Normal, Cheerful, Sad, Laughing, Crying, Singing, Whispering, Angry, Village Sweet].
      
      Text: "${text}"`,
    });
    const detected = response.text?.trim() as VoiceEmotion;
    return EMOTIONS.includes(detected) ? detected : 'Normal';
  } catch (error) {
    console.error("Emotion detection failed:", error);
    return 'Normal';
  }
}

export async function generateSpeech(text: string, emotion: VoiceEmotion, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'): Promise<string> {
  let prompt = text;
  
  // Custom instructions per emotion
  switch (emotion) {
    case 'Laughing':
      prompt = `Say with a big laugh: ${text}`;
      break;
    case 'Crying':
      prompt = `Say while crying and sobbing: ${text}`;
      break;
    case 'Singing':
      prompt = `Sing this text beautifully like a song: ${text}`;
      break;
    case 'Village Sweet':
      prompt = `Say in a very sweet, soft, natural village-style tone: ${text}`;
      break;
    case 'Cheerful':
      prompt = `Say cheerfully: ${text}`;
      break;
    case 'Sad':
      prompt = `Say sadly: ${text}`;
      break;
    case 'Whispering':
      prompt = `Whisper softly: ${text}`;
      break;
    case 'Angry':
      prompt = `Say angrily: ${text}`;
      break;
    default:
      prompt = text;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio data");
  }

  // Gemini TTS returns raw PCM 16-bit 24kHz. We wrap it in a WAV header to make it a valid file.
  const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
  const wavData = addWavHeader(pcmData, 24000);
  
  // Return as base64 for history/playback
  let binary = '';
  for (let i = 0; i < wavData.length; i++) {
    binary += String.fromCharCode(wavData[i]);
  }
  return btoa(binary);
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + pcmData.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcmData.length, true);

  const wav = new Uint8Array(header.byteLength + pcmData.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcmData, header.byteLength);
  return wav;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
