const express = require('express');
const cors = require('cors');
const path = require('path');
const { BODY_LIMIT, PARAMETER_LIMIT, UPLOAD_TIMEOUT_MS, PORT } = require('./config/env');
const routes = require('./routes');
const { loadFonts } = require('./config/fonts');

const app = express();

app.use(cors());
app.use(express.json({ limit: BODY_LIMIT, parameterLimit: PARAMETER_LIMIT, extended: true }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true, parameterLimit: PARAMETER_LIMIT }));
app.use(express.raw({ limit: BODY_LIMIT, type: ['image/png', 'image/jpeg', 'application/octet-stream'] }));

// 1. Định nghĩa đường dẫn
const TEMP_DIR = path.join(__dirname, 'tmp');
app.use('/outputs', express.static(path.join(__dirname, 'public/outputs')));

// 2. LOG QUAN TRỌNG (Backend)
// Log này sẽ chạy 1 LẦN khi server khởi động
console.log(`[SERVER] Đang phục vụ file tĩnh tại URL '/static'`);
console.log(`[SERVER] Đường dẫn thư mục (ABSOLUTE): ${TEMP_DIR}`);

// 3. Phục vụ file
app.use('/static', express.static(TEMP_DIR));

app.use((req, res, next) => {
  if (req.path.includes('upload')) {
    req.setTimeout(UPLOAD_TIMEOUT_MS);
    res.setTimeout(UPLOAD_TIMEOUT_MS);
    if (req.connection && req.connection.setTimeout) req.connection.setTimeout(UPLOAD_TIMEOUT_MS);
  }
  next();
});

loadFonts();

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


