const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'storage');
const ROBLOX_TOKEN = process.env.ROBLOX_TOKEN || 'change_me';
const UPLOAD_MAX_FILE_BYTES = parseInt(process.env.UPLOAD_MAX_FILE_BYTES || '10485760', 10); // default 10MB

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });

const app = express();

// Do NOT serve the storage folder statically.
// app.use('/storage', express.static(STORAGE_PATH)); // <-- DON'T DO THIS

// Serve uploader HTML for convenience (could be hosted separately)
app.use(express.static(path.join(__dirname))); // serves index.html and README etc.

// Multer setup: store files in a temp location first
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_FILE_BYTES }
});

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  // Create a safe id and store file and metadata
  const id = generateId();
  const filePath = path.join(STORAGE_PATH, id + '.bin'); // stored binary
  const metaPath = path.join(STORAGE_PATH, id + '.json');

  const metadata = {
    id,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(filePath, req.file.buffer);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), { flag: 'w' });
  } catch (err) {
    console.error('Write error', err);
    return res.status(500).send('Server error saving file');
  }

  const downloadUrl = `/download/${id}`;
  res.json({ id, downloadUrl });
});

// Download endpoint: requires Roblox token header
app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  const token = req.header('X-Roblox-Token');

  if (!token || token !== ROBLOX_TOKEN) {
    // Do not reveal whether file exists or not
    return res.status(403).send('Forbidden');
  }

  const filePath = path.join(STORAGE_PATH, id + '.bin');
  const metaPath = path.join(STORAGE_PATH, id + '.json');

  if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
    return res.status(404).send('Not found');
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    // Use attachment so browser downloads it instead of trying to open
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(metadata.originalName)}"`);
    // Optional: a header to indicate this is restricted
    res.setHeader('X-Served-For', 'roblox-client');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error', err);
      res.status(500).end('Server error');
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Download error', err);
    res.status(500).send('Server error');
  }
});

// Basic health
app.get('/health', (req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Uploader server listening on port ${PORT}`);
  console.log(`Storage path: ${STORAGE_PATH}`);
});
