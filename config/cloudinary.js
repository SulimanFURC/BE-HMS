const cloudinary = require('cloudinary').v2;
const stream = require('stream');

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (base64String, folder, filename) => {
    if (!base64String) return null;

    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid Base64 string');
    }

    const buffer = Buffer.from(matches[2], 'base64');
    return new Promise((resolve, reject) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto',
                public_id: filename ? filename.split('.')[0] : undefined
            },
            (error, result) => {
                if (error) return reject(new Error('Cloudinary upload failed: ' + error.message));
                resolve(result.secure_url);
            }
        );
        bufferStream.pipe(uploadStream);
    });
};

module.exports = { uploadOnCloudinary };