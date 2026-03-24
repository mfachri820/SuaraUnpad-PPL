import cloudinary from '@/lib/cloudinary';

export const uploadService = {
  
  async uploadImage(fileBuffer: Buffer, folder: string = 'suara_unpad/general'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload gagal, tidak ada hasil dari Cloudinary'));
          
          resolve(result.secure_url);
        }
      );

      uploadStream.end(fileBuffer);
    });
  }
};