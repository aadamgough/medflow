import multer from 'multer';
import { Request } from 'express';
import { logger } from '../utils/logger';

// File size limit: 50MB for documents
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// File size limit: 2MB for profile pictures
const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;

// Allowed MIME types for medical documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
];

// Allowed MIME types for profile pictures
const ALLOWED_PROFILE_PICTURE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function for documents
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

// File filter function for profile pictures
const profilePictureFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Check MIME type
  if (ALLOWED_PROFILE_PICTURE_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    logger.warn('Profile picture upload rejected - invalid type', {
      mimetype: file.mimetype,
      filename: file.originalname,
    });
    callback(new Error(`Invalid file type. Allowed types: ${ALLOWED_PROFILE_PICTURE_TYPES.join(', ')}`));
  }
};

// Create multer upload middleware for documents
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file at a time
  },
  fileFilter,
});

// Create multer upload middleware for profile pictures
export const profilePictureUpload = multer({
  storage,
  limits: {
    fileSize: MAX_PROFILE_PICTURE_SIZE,
    files: 1,
  },
  fileFilter: profilePictureFileFilter,
});

// Validation constants export for use in controllers
export const UPLOAD_LIMITS = {
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
};

export const PROFILE_PICTURE_LIMITS = {
  maxFileSize: MAX_PROFILE_PICTURE_SIZE,
  allowedMimeTypes: ALLOWED_PROFILE_PICTURE_TYPES,
};
