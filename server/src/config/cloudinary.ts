import { v2 as cloudinary } from 'cloudinary';
import { config } from './database';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

// Upload options for different media types
export const uploadOptions = {
  profile: {
    folder: 'twilsta/profiles',
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good',
        format: 'jpg',
      },
    ],
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    max_file_size: 5000000, // 5MB
  },
  post: {
    folder: 'twilsta/posts',
    quality: 'auto:good',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov'],
    max_file_size: 50000000, // 50MB
  },
  story: {
    folder: 'twilsta/stories',
    quality: 'auto:good',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov'],
    max_file_size: 30000000, // 30MB
  },
  thumbnail: {
    folder: 'twilsta/thumbnails',
    transformation: [
      {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto:low',
        format: 'jpg',
      },
    ],
    allowed_formats: ['jpg', 'png', 'jpeg'],
    max_file_size: 10000000, // 10MB
  },
} as const;

// Upload helper class
export class CloudinaryService {
  // Upload single file
  static async uploadFile(
    file: string, // Cloudinary upload method expects string path or data URL
    options: any = {},
    type: 'profile' | 'post' | 'story' | 'thumbnail' = 'post'
  ): Promise<any> {
    try {
      const uploadConfig = { ...uploadOptions[type], ...options };

      const result = await cloudinary.uploader.upload(file, {
        ...uploadConfig,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
      };
    } catch (error) {
      logger.error('Error uploading file to Cloudinary:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Upload multiple files
  static async uploadFiles(
    files: string[],
    options: any = {},
    type: 'profile' | 'post' | 'story' | 'thumbnail' = 'post'
  ): Promise<any[]> {
    try {
      const uploadPromises = files.map((file) =>
        CloudinaryService.uploadFile(file, options, type)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Error uploading multiple files to Cloudinary:', error);
      throw new Error('Failed to upload files');
    }
  }

  // Delete file by public_id
  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error(`Error deleting file ${publicId} from Cloudinary:`, error);
      return false;
    }
  }

  // Delete multiple files
  static async deleteFiles(
    publicIds: string[]
  ): Promise<{ deleted: string[]; failed: string[] }> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);

      const deleted = Object.keys(result.deleted).filter(
        (id) => result.deleted[id] === 'deleted'
      );
      const failed = publicIds.filter((id) => !deleted.includes(id));

      return { deleted, failed };
    } catch (error) {
      logger.error('Error deleting multiple files from Cloudinary:', error);
      return { deleted: [], failed: publicIds };
    }
  }

  // Generate thumbnail URL
  static generateThumbnail(
    publicId: string,
    width: number = 300,
    height: number = 300
  ): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto:low',
      format: 'jpg',
    });
  }

  // Generate responsive URLs
  static generateResponsiveUrls(publicId: string): {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      thumbnail: cloudinary.url(publicId, {
        width: 150,
        height: 150,
        crop: 'fill',
        quality: 'auto:low',
      }),
      small: cloudinary.url(publicId, { width: 400, quality: 'auto:good' }),
      medium: cloudinary.url(publicId, { width: 800, quality: 'auto:good' }),
      large: cloudinary.url(publicId, { width: 1200, quality: 'auto:good' }),
      original: cloudinary.url(publicId, { quality: 'auto:best' }),
    };
  }

  // Generate video thumbnail
  static generateVideoThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      quality: 'auto:good',
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { overlay: 'play_button', gravity: 'center' },
      ],
    });
  }

  // Get file info
  static async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
        resource_type: result.resource_type,
      };
    } catch (error) {
      logger.error(`Error getting file info for ${publicId}:`, error);
      throw new Error('Failed to get file info');
    }
  }

  // Search files
  static async searchFiles(
    expression: string,
    maxResults: number = 20
  ): Promise<any[]> {
    try {
      const result = await cloudinary.search
        .expression(expression)
        .max_results(maxResults)
        .execute();

      return result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        bytes: resource.bytes,
        created_at: resource.created_at,
        resource_type: resource.resource_type,
      }));
    } catch (error) {
      logger.error('Error searching files in Cloudinary:', error);
      throw new Error('Failed to search files');
    }
  }

  // Get storage usage
  static async getUsage(): Promise<any> {
    try {
      const result = await cloudinary.api.usage();
      return {
        used_storage: result.storage.used,
        limit_storage: result.storage.limit,
        used_bandwidth: result.bandwidth.used,
        limit_bandwidth: result.bandwidth.limit,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting Cloudinary usage:', error);
      throw new Error('Failed to get usage info');
    }
  }
}

// Health check for Cloudinary
export const checkCloudinaryHealth = async () => {
  try {
    await cloudinary.api.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error: any) {
    logger.error('❌ Cloudinary health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Validate file before upload
export const validateFile = (
  file: any,
  type: 'profile' | 'post' | 'story' | 'thumbnail' = 'post'
) => {
  const options = uploadOptions[type];

  // Check file size
  if (file.size > options.max_file_size) {
    throw new Error(
      `File size exceeds limit of ${options.max_file_size / 1024 / 1024}MB`
    );
  }

  // Check file format
  const fileExtension = file.mimetype.split('/')[1];
  if (!options.allowed_formats.includes(fileExtension)) {
    throw new Error(`File format ${fileExtension} is not allowed`);
  }

  return true;
};

export default cloudinary;
