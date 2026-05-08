import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

/**
 * Recursively gets all files in a directory.
 */
const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
};

/**
 * Uploads an entire directory of HLS files to Cloudinary.
 * @param {string} localDir - The local directory containing HLS files.
 * @param {string} cloudBaseFolder - The base folder name in Cloudinary (e.g., 'videos/12345/hls').
 * @returns {Promise<string>} - The Cloudinary URL of the master.m3u8 file.
 */
export const uploadHlsDirectoryToCloudinary = async (localDir, cloudBaseFolder) => {
    const files = getAllFiles(localDir);
    let masterPlaylistUrl = null;

    console.log(`Starting upload of ${files.length} HLS files to Cloudinary...`);

    const uploadPromises = files.map(async (filePath) => {
        // Calculate relative path to maintain structure
        const relativePath = path.relative(localDir, filePath);
        // Replace Windows backslashes with forward slashes for Cloudinary public_id
        const normalizedRelativePath = relativePath.split(path.sep).join('/');
        
        const publicId = `${cloudBaseFolder}/${normalizedRelativePath}`;

        try {
            const response = await cloudinary.uploader.upload(filePath, {
                resource_type: "raw", // MUST be raw to preserve exact content and relative linking
                public_id: publicId
            });

            if (normalizedRelativePath === 'master.m3u8') {
                masterPlaylistUrl = response.secure_url;
            }
        } catch (error) {
            console.error(`Failed to upload ${filePath}:`, error);
            throw error;
        }
    });

    // Upload in batches or all together (Cloudinary might rate limit if too many files)
    // For MVP, Promise.all is fine, but chunking is safer for production.
    const chunkSize = 10;
    for (let i = 0; i < uploadPromises.length; i += chunkSize) {
        const chunk = uploadPromises.slice(i, i + chunkSize);
        await Promise.all(chunk);
    }

    console.log('All HLS files uploaded to Cloudinary successfully.');
    return masterPlaylistUrl;
};
