/**
 * Centralized global error handling middleware for the Express application.
 * Logs full diagnostic stack traces and returns clean, structured JSON payloads.
 */
module.exports = (err, req, res, next) => {
  console.error("Centralized Error Caught:");
  console.error(err.stack || err.message || err);

  // 1. Catch Express Body Parser Payload Limit Errors (PayloadTooLargeError)
  if (err.status === 413 || err.type === 'entity.too.large' || err.message.includes('too large')) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. The maximum permissible size is 50MB for raw JSON.'
    });
  }

  // 2. Catch Multer File Upload Limits (MulterError)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File upload limit exceeded. Upload documents must not exceed 10MB.'
    });
  }

  // 3. Catch Custom validation/type filters
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('OCR'))) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // 4. Catch General Uncaught Server Failures
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
};
