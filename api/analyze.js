import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import axios from 'axios';

export const config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  const form = formidable({ multiples: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function extractTextFromFile(file) {
  const path = file.filepath || file.path || file.file;
  const name = file.originalFilename || file.originalname || file.newFilename || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  try {
    const buffer = fs.readFileSync(path);
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text || '';
    }
    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }
    if (['png','jpg','jpeg','bmp','tiff'].includes(ext)) {
      const { data } = await Tesseract.recognize(buffer, 'eng+ind');
      return data.text || '';
    }
    if (ext === 'txt') {
      return fs.readFileSync(path, 'utf8');
    }
    return fs.readFileSync(path, 'utf8').slice(0, 20000);
  } catch (e) {
    console.error('extract error', e);
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { fields, files } = await parseForm(req);
    const caseDescription = Array.isArray(fields.caseDescription) ? fields.caseDescription[0] : (fields.caseDescription || '');
    const fileItems = [];
    for (const k of Object.keys(files || {})) {
      const v = files[k];
      if (Array.isArray(v)) {
        for (const it of v) fileItems.push(it);
      } else fileItems.push(v);
    }
    let extracted = [];
    for (const f of fileItems) {
      const txt = await extractTextFromFile(f);
      extracted.push({ filename: f.originalFilename || f.newFilename || 'file', text: txt.slice(0,20000) });
    }

    const filesSummary = extracted.map(e => `File: ${e.filename}\n${e.text.substring(0,2000)}`).join('\n---\n');
    const prompt = `
You are AsGuJu Pro, an Indonesian legal assistant for courtroom support.
Combine the case description and the uploaded file contents below, analyze relevant criminal law issues (KUHP, KUHAP) and provide:
- Facts & Evidence (concise)
- Relevant Articles (cite KUHP/KUHAP; if possible reference official sources)
- Legal Arguments (step-by-step: facts -> legal elements -> application)
- Conclusion & recommended charges / evidence to strengthen
Produce output in Markdown, concise (max ~700 words). Be explicit about uncertainty (use wording like "indikasi" or "kemungkinan").

Case description:
${caseDescription}

File contents (top parts):
${filesSummary}
`;

    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash';
    if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const endpoint = `https://generativelanguage.googleapis.com/v1/${MODEL}:generateContent?key=${API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    const r = await axios.post(endpoint, body, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
    const resultText = r.data?.candidates?.[0]?.content?.parts?.[0]?.text || (r.data ? JSON.stringify(r.data).slice(0,2000) : 'No response');

    return res.status(200).json({ result: resultText, extracted });
  } catch (err) {
    console.error('Handler error', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
