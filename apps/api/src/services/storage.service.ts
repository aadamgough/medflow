import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3Config, isAwsConfigured, awsServiceConfig } from '../config/aws';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class StorageService {
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    patientId: string
  ): Promise<{ path: string; publicUrl: string }> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured. Cannot upload files.');
    }

    try {
      const fileExtension = file.originalname.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const key = `documents/${userId}/${patientId}/${uniqueId}.${fileExtension}`;

      logger.info('Uploading file to S3', {
        originalName: file.originalname,
        key,
        size: file.size,
        bucket: s3Config.documentsBucket,
      });

      if (file.size > awsServiceConfig.s3.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${awsServiceConfig.s3.maxFileSize / 1024 / 1024}MB`);
      }

      if (!awsServiceConfig.s3.allowedDocumentTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed`);
      }

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Config.documentsBucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          'original-filename': encodeURIComponent(file.originalname),
          'user-id': userId,
          'patient-id': patientId,
        },
      }));

      const signedUrl = await this.getSignedDownloadUrl(key);

      logger.info('File uploaded successfully to S3', { key });

      return {
        path: key,
        publicUrl: signedUrl,
      };
    } catch (error) {
      logger.error('S3 upload error', error);
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured. Cannot download files.');
    }

    try {
      logger.info('Downloading file from S3', { key, bucket: s3Config.documentsBucket });

      const response = await s3Client.send(new GetObjectCommand({
        Bucket: s3Config.documentsBucket,
        Key: key,
      }));

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      logger.info('File downloaded successfully from S3', { key, size: buffer.length });
      
      return buffer;
    } catch (error) {
      logger.error('S3 download error', { key, error });
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured. Cannot delete files.');
    }

    try {
      logger.info('Deleting file from S3', { key, bucket: s3Config.documentsBucket });

      await s3Client.send(new DeleteObjectCommand({
        Bucket: s3Config.documentsBucket,
        Key: key,
      }));

      logger.info('File deleted successfully from S3', { key });
    } catch (error) {
      logger.error('S3 delete error', { key, error });
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured.');
    }

    const command = new GetObjectCommand({
      Bucket: s3Config.documentsBucket,
      Key: key,
    });

    return getSignedUrl(s3Client, command, {
      expiresIn: expiresIn || s3Config.downloadUrlExpiration,
    });
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured.');
    }

    const command = new PutObjectCommand({
      Bucket: s3Config.documentsBucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, {
      expiresIn: expiresIn || s3Config.uploadUrlExpiration,
    });
  }

  async fileExists(key: string): Promise<boolean> {
    if (!isAwsConfigured()) {
      return false;
    }

    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: s3Config.documentsBucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async ensureBucketExists(): Promise<void> {
    logger.info('S3 bucket check - buckets should be pre-created', {
      documentsBucket: s3Config.documentsBucket,
      profilePicturesBucket: s3Config.profilePicturesBucket,
    });
  }

  async uploadProfilePicture(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ path: string; publicUrl: string }> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured. Cannot upload files.');
    }

    try {
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const key = `profile-pictures/${userId}/profile.${fileExtension}`;

      logger.info('Uploading profile picture to S3', {
        originalName: file.originalname,
        key,
        size: file.size,
        bucket: s3Config.profilePicturesBucket,
      });

      if (file.size > awsServiceConfig.s3.maxProfilePictureSize) {
        throw new Error(`Profile picture size exceeds maximum allowed size of ${awsServiceConfig.s3.maxProfilePictureSize / 1024 / 1024}MB`);
      }

      if (!awsServiceConfig.s3.allowedProfilePictureTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed for profile pictures`);
      }

      await this.deleteExistingProfilePictures(userId);

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Config.profilePicturesBucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          'user-id': userId,
        },
      }));

      const publicUrl = `https://${s3Config.profilePicturesBucket}.s3.${s3Config.region}.amazonaws.com/${key}`;

      logger.info('Profile picture uploaded successfully to S3', { key });

      return {
        path: key,
        publicUrl,
      };
    } catch (error) {
      logger.error('S3 profile picture upload error', error);
      throw error;
    }
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured. Cannot delete files.');
    }

    try {
      await this.deleteExistingProfilePictures(userId);
        logger.info('Profile picture deleted successfully', { userId });
    } catch (error) {
      logger.error('S3 profile picture delete error', error);
      throw error;
    }
  }

  private async deleteExistingProfilePictures(userId: string): Promise<void> {
    try {
      const prefix = `profile-pictures/${userId}/`;
      
      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: s3Config.profilePicturesBucket,
        Prefix: prefix,
      }));

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: s3Config.profilePicturesBucket,
              Key: object.Key,
            }));
            logger.info('Deleted existing profile picture', { key: object.Key });
          }
        }
      }
    } catch (error) {
      logger.warn('Error deleting existing profile pictures', { userId, error });
    }
  }

  async uploadForTextractProcessing(
    fileBuffer: Buffer,
    documentId: string,
    mimeType: string
  ): Promise<{ bucket: string; key: string }> {
    if (!isAwsConfigured()) {
      throw new Error('AWS credentials not configured for S3 upload');
    }

    const extension = mimeType === 'application/pdf' ? 'pdf' : 'png';
    const key = `textract-processing/${documentId}.${extension}`;

    logger.info('Uploading to S3 for Textract processing', {
      bucket: s3Config.documentsBucket,
      key,
      size: fileBuffer.length,
    });

    await s3Client.send(new PutObjectCommand({
      Bucket: s3Config.documentsBucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    }));

    return {
      bucket: s3Config.documentsBucket,
      key,
    };
  }

  async deleteTextractProcessingFile(key: string): Promise<void> {
    if (!isAwsConfigured()) {
      return;
    }

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: s3Config.documentsBucket,
        Key: key,
      }));
      logger.info('Deleted Textract processing file from S3', { key });
    } catch (error) {
      logger.warn('Failed to delete Textract processing file', { key, error });
    }
  }
}

export const storageService = new StorageService();
