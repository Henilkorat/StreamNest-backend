import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic);

const QUALITIES = [
    { name: '240p', resolution: '426x240', bitrate: '400k' },
    { name: '360p', resolution: '640x360', bitrate: '800k' },
    { name: '480p', resolution: '854x480', bitrate: '1200k' },
    { name: '720p', resolution: '1280x720', bitrate: '2500k' }
];

/**
 * Converts an MP4 file to HLS format with multiple qualities.
 * @param {string} inputPath - The local path to the input MP4 file.
 * @param {string} outputDir - The directory where HLS files will be saved.
 * @returns {Promise<string>} - The path to the master.m3u8 playlist.
 */
export const convertToHLS = (inputPath, outputDir) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
        let masterPlaylistContent = '#EXTM3U\n#EXT-X-VERSION:3\n';

        let command = ffmpeg(inputPath);

        QUALITIES.forEach((quality, index) => {
            const qualityDir = path.join(outputDir, quality.name);
            if (!fs.existsSync(qualityDir)) {
                fs.mkdirSync(qualityDir, { recursive: true });
            }

            const segmentFilename = path.join(qualityDir, 'segment%03d.ts');
            const playlistFilename = path.join(qualityDir, 'index.m3u8');

            command = command
                .output(playlistFilename)
                .outputOptions([
                    `-vf scale=${quality.resolution}`,
                    `-b:v ${quality.bitrate}`,
                    `-c:v libx264`,
                    `-c:a aac`,
                    `-b:a 128k`,
                    `-f hls`,
                    `-hls_time 4`,
                    `-hls_playlist_type vod`,
                    `-hls_segment_filename ${segmentFilename}`
                ]);

            // Add to master playlist
            const bandwidth = parseInt(quality.bitrate.replace('k', '000')) + 128000;
            const res = quality.resolution;
            masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res}\n${quality.name}/index.m3u8\n`;
        });

        command
            .on('start', (commandLine) => {
                console.log('Spawned FFmpeg with command: ' + commandLine);
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.percent + '% done');
            })
            .on('end', () => {
                console.log('FFmpeg processing completed successfully.');
                // Write master playlist
                fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
                resolve(masterPlaylistPath);
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error processing video:', err.message);
                console.error('FFmpeg stderr:', stderr);
                reject(err);
            })
            .run();
    });
};
