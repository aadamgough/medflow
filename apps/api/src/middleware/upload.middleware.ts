import multer from 'multer';
import { Request } from 'express';
import { logger } from '../utils/logger';

// File size limit: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types for medical documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
];

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Check MIME type
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    logger.warn('File upload rejected - invalid type', {
      mimetype: file.mimetype,
      filename: file.originalname,
    });
    callback(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Create multer upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file at a time
  },
  fileFilter,
});

// Validation constants export for use in controllers
export const UPLOAD_LIMITS = {
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
};
