import fs from 'fs';
import path from 'path';
import { convertToHLS } from './ffmpeg.service.js';
import { uploadHlsDirectoryToCloudinary } from './cloudinary.service.js';
import { Video } from '../models/video.model.js';

/**
 * Process video in background.
 * 1. Convert to HLS using FFmpeg
 * 2. Upload HLS files to Cloudinary
 * 3. Update DB
 * 4. Cleanup local files
 */
export const processVideo = async (videoId, localFilePath) => {
    try {
        console.log(`Starting background processing for video ${videoId}`);
        const outputDir = path.join(process.cwd(), 'public', 'temp', 'hls', videoId.toString());
        
        // 1. Convert to HLS
        await convertToHLS(localFilePath, outputDir);
        
        // 2. Upload to Cloudinary
        const cloudFolder = `videos/${videoId}/hls`;
        const masterPlaylistUrl = await uploadHlsDirectoryToCloudinary(outputDir, cloudFolder);
        
        // 3. Update Database
        await Video.findByIdAndUpdate(videoId, {
            processingStatus: 'completed',
            masterPlaylistUrl: masterPlaylistUrl,
            qualities: ['240p', '360p', '480p', '720p']
        });
        
        console.log(`Video ${videoId} processed successfully.`);
    } catch (error) {
        console.error(`Error processing video ${videoId}:`, error);
        // Mark as failed in DB
        await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
    } finally {
        // 4. Cleanup local files (original MP4 and generated HLS dir)
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        const outputDir = path.join(process.cwd(), 'public', 'temp', 'hls', videoId.toString());
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
    }
};
