const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json());

const defaultData = {
  teamMembers: [],
  categories: [
    { id: 'cat-1', name: 'Kitchen', color: '#22c55e' },
    { id: 'cat-2', name: 'Bathroom', color: '#3b82f6' },
    { id: 'cat-3', name: 'Common Area', color: '#f59e0b' },
    { id: 'cat-4', name: 'Office', color: '#8b5cf6' },
  ],
  chores: [],
  completions: [],
};

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/data', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.put('/api/data', (req, res) => {
  try {
    writeData(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
