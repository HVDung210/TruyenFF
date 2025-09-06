const express = require('express');
const cors = require('cors');
const { BODY_LIMIT, PARAMETER_LIMIT, UPLOAD_TIMEOUT_MS, PORT } = require('./config/env');
const routes = require('./routes');
const { loadFonts } = require('./config/fonts');

const app = express();

app.use(cors());
app.use(express.json({ limit: BODY_LIMIT, parameterLimit: PARAMETER_LIMIT, extended: true }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true, parameterLimit: PARAMETER_LIMIT }));
app.use(express.raw({ limit: BODY_LIMIT, type: ['image/png', 'image/jpeg', 'application/octet-stream'] }));

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


