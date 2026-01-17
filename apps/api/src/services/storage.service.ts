import { getSupabase } from '../config/supabase';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class StorageService {
  private readonly bucketName = 'documents';
  private readonly profilePicturesBucket = 'profile-pictures';

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    patientId: string
  ): Promise<{ path: string; publicUrl: string }> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const filePath = `${userId}/${patientId}/${uniqueId}.${fileExtension}`;

      logger.info('Uploading file to Supabase Storage', {
        originalName: file.originalname,
        path: filePath,
        size: file.size,
      });

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

  async uploadProfilePicture(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ path: string; publicUrl: string }> {
    try {
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const filePath = `${userId}/profile.${fileExtension}`;

      logger.info('Uploading profile picture to Supabase Storage', {
        originalName: file.originalname,
        path: filePath,
        size: file.size,
      });

      const supabase = getSupabase();
      
      // First, ensure the bucket exists
      await this.ensureProfilePicturesBucketExists();

      // Delete any existing profile picture for this user
      const { data: existingFiles } = await supabase.storage
        .from(this.profilePicturesBucket)
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from(this.profilePicturesBucket)
          .remove(filesToDelete);
        logger.info('Deleted existing profile picture(s)', { count: filesToDelete.length });
      }

      // Upload the new profile picture
      const { data, error } = await supabase.storage
        .from(this.profilePicturesBucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        logger.error('Supabase profile picture upload error', error);
        throw new Error(`Failed to upload profile picture: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(this.profilePicturesBucket)
        .getPublicUrl(filePath);

      logger.info('Profile picture uploaded successfully', { path: filePath });

      return {
        path: data.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      logger.error('Profile picture upload error', error);
      throw error;
    }
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // List all files in the user's profile pictures folder
      const { data: existingFiles } = await supabase.storage
        .from(this.profilePicturesBucket)
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        const { error } = await supabase.storage
          .from(this.profilePicturesBucket)
          .remove(filesToDelete);

        if (error) {
          logger.error('Supabase profile picture delete error', error);
          throw new Error(`Failed to delete profile picture: ${error.message}`);
        }

        logger.info('Profile picture deleted successfully', { userId });
      }
    } catch (error) {
      logger.error('Delete profile picture error', error);
      throw error;
    }
  }

  private async ensureProfilePicturesBucketExists(): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.profilePicturesBucket);

      if (!bucketExists) {
        logger.info('Creating profile-pictures bucket');
        const { error } = await supabase.storage.createBucket(this.profilePicturesBucket, {
          public: true, // Profile pictures should be publicly accessible
          fileSizeLimit: 2097152, // 2MB limit for profile pictures
        });

        if (error) {
          logger.error('Failed to create profile-pictures bucket', error);
        } else {
          logger.info('Profile-pictures bucket created successfully');
        }
      }
    } catch (error) {
      logger.warn('Could not check/create profile-pictures bucket', error);
    }
  }
}

export const storageService = new StorageService();
