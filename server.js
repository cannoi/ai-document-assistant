const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize SQLite database
const db = new sqlite3.Database('./documents.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT, content TEXT, upload_date TEXT, user_id TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, email TEXT)");
});

app.use(express.static('public'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Helper to call AI provider
async function callAI(settings, promptText) {
  const provider = settings?.provider || 'deepseek';
  const apiKey = settings?.apiKey || '';
  const model = settings?.model || 'deepseek-chat';
  let url = 'https://api.deepseek.com/v1/chat/completions';
  let headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    body = {
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: promptText }]
    };
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: promptText }]
    };
  } else if (provider === 'ollama') {
    const baseUrl = settings?.endpoint || 'http://localhost:11434';
    url = `${baseUrl.replace(/\/+$/, '')}/api/generate`;
    body = {
      model: model || 'llama3',
      prompt: promptText,
      stream: false
    };
  } else if (provider === 'custom') {
    url = settings?.endpoint || 'https://api.deepseek.com/chat/completions';
    body = {
      model: model,
      messages: [{ role: 'user', content: promptText }]
    };
  } else {
    body = {
      model: model,
      messages: [{ role: 'user', content: promptText }]
    };
  }

  try {
    const response = await axios.post(url, body, { headers });
    if (provider === 'anthropic') {
      return response.data.content?.[0]?.text || JSON.stringify(response.data);
    }
    if (provider === 'ollama') {
      return response.data.response || JSON.stringify(response.data);
    }
    return response.data.choices?.[0]?.message?.content || response.data.summary || response.data.answer || JSON.stringify(response.data);
  } catch (error) {
    return `[Mô phỏng AI (${provider}/${model}) do chưa kết nối API thực hoặc lỗi mạng]: Đã phân tích tài liệu với nội dung: "${promptText.substring(0, 150)}..."`;
  }
}

// Upload document
app.post('/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const { originalname, path: filePath } = req.file;
  const documentId = Date.now().toString();
  const uploadDate = new Date().toISOString();
  
  let fileContent = '';
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    fileContent = 'Tài liệu nhị phân hoặc không đọc được trực tiếp.';
  }

  db.run("INSERT INTO documents (id, name, content, upload_date, user_id) VALUES (?, ?, ?, ?, ?)", [documentId, originalname, fileContent, uploadDate, 'user1'], (err) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send({ id: documentId });
  });
});

// Summarize document
app.post('/summarize', async (req, res) => {
  const { documentId, settings } = req.body;

  db.get("SELECT content FROM documents WHERE id = ?", [documentId], async (err, row) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (!row) {
      return res.status(404).send('Document not found');
    }

    const promptText = `Hãy tóm tắt ngắn gọn tài liệu sau:\n\n${row.content}`;
    const summary = await callAI(settings, promptText);
    res.status(200).send({ summary });
  });
});

// Answer question
app.post('/answer', async (req, res) => {
  const { documentId, question, settings } = req.body;

  db.get("SELECT content FROM documents WHERE id = ?", [documentId], async (err, row) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (!row) {
      return res.status(404).send('Document not found');
    }

    const promptText = `Dựa vào tài liệu sau:\n\n${row.content}\n\nHãy trả lời câu hỏi: ${question}`;
    const answer = await callAI(settings, promptText);
    res.status(200).send({ answer });
  });
});

// Search information
app.post('/search', async (req, res) => {
  const { documentId, query, settings } = req.body;

  db.get("SELECT content FROM documents WHERE id = ?", [documentId], async (err, row) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (!row) {
      return res.status(404).send('Document not found');
    }

    const promptText = `Tìm kiếm thông tin liên quan đến "${query}" trong tài liệu sau:\n\n${row.content}`;
    const searchResult = await callAI(settings, promptText);
    res.status(200).send({ results: [searchResult] });
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
