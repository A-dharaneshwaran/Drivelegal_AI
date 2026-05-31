const multer = require('multer');

// Configure raw in-memory storage buffer
const storage = multer.memoryStorage();

// Accept only images (JPG, JPEG, PNG) and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF uploads are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Maximum upload size: 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
