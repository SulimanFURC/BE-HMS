const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

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

    // Decode Base64 to buffer
    const buffer = Buffer.from(matches[2], 'base64');
    const tempFilePath = path.join(__dirname, '..', 'uploads', filename);
    // Save the file temporarily
    fs.writeFileSync(tempFilePath, buffer);

    try {
        // Upload the temporary file to Cloudinary
        const result = await cloudinary.uploader.upload(tempFilePath, {
            folder: folder,
            resource_type: 'auto'
        });

        // Remove the temporary file
        fs.unlinkSync(tempFilePath);
        return result.secure_url; // Return the Cloudinary URL
    } catch (error) {
        fs.unlinkSync(tempFilePath); // Clean up even on failure
        throw new Error('Cloudinary upload failed: ' + error.message);
    }
};


module.exports = { uploadOnCloudinary };