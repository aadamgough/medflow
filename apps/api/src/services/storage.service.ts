import { getSupabase } from '../config/supabase';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class StorageService {
  private readonly bucketName = 'documents';

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    patientId: string
  ): Promise<{ path: string; publicUrl: string }> {
    try {
      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const filePath = `${userId}/${patientId}/${uniqueId}.${fileExtension}`;

      logger.info('Uploading file to Supabase Storage', {
        originalName: file.originalname,
        path: filePath,
        size: file.size,
      });

      // Upload to Supabase Storage
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        logger.error('Supabase upload error', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      logger.info('File uploaded successfully', { path: filePath });

      return {
        path: data.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      logger.error('Storage service error', error);
      throw error;
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        logger.error('Supabase download error', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error('Download file error', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        logger.error('Supabase delete error', error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      logger.info('File deleted successfully', { path: filePath });
    } catch (error) {
      logger.error('Delete file error', error);
      throw error;
    }
  }

  async ensureBucketExists(): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        logger.info('Creating documents bucket');
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
        });

        if (error) {
          logger.error('Failed to create bucket', error);
        } else {
          logger.info('Documents bucket created successfully');
        }
      }
    } catch (error) {
      logger.warn('Could not check/create bucket', error);
    }
  }
}

export const storageService = new StorageService();
