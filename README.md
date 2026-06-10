# StreamNest Backend

StreamNest is a Node.js/Express API backend for a video sharing platform that features background video transcoding to HLS, secure JWT session management, social interactions, and custom channel dashboards.

## Features

* **HLS Transcoding**: Converts MP4 video uploads in the background into HLS streams (`240p` to `720p`) using FFmpeg.
* **Asset Uploads**: Recursively uploads transcoded HLS directory trees to Cloudinary as raw assets.
* **Authentication**: JWT-based session security using secure HTTP-only cookies (`accessToken` and `refreshToken`).
* **Content & Socials**: Support for comments (paginated), likes (polymorphic structure), custom playlists, tweets, and channel subscriptions.
* **Dashboards**: Statistics aggregation for channel views, subscribers, video uploads, and total likes.

## Tech Stack

* **Core**: Node.js (ES Modules), Express 5
* **Database**: MongoDB & Mongoose
* **Storage**: Cloudinary (file storage) & Multer (local parsing)
* **Processing**: FFmpeg (`fluent-ffmpeg` & `ffmpeg-static`)
* **Auth**: JSON Web Tokens (`jsonwebtoken`) & Bcrypt

## Architecture Overview

```
Client -> Express Server -> Controllers -> Mongoose -> MongoDB
                             | (On Upload)
                             v
                  Local Temp (Multer) -> FFmpeg (Transcode) -> Cloudinary (Upload)
```

1. **Upload Handler**: Thumbnail is uploaded immediately; video is created in DB with status `'processing'`.
2. **Background Transcoder**: Spawns an asynchronous job to transcode video to resolution-specific `.ts` segments and a `master.m3u8` playlist.
3. **Storage Sync**: HLS directories are uploaded recursively as raw resources to Cloudinary. On success, the video status transitions to `'completed'`.

## Project Structure

```
.
├── Dockerfile            # Production container configuration
├── src/
    ├── app.js            # Express app configuration & middlewares
    ├── index.js          # DB connection & HTTP server lifecycle
    ├── controllers/      # Route controllers (user, video, playlist, comment, etc.)
    ├── db/               # Database connection configurations
    ├── middlewares/      # Express middlewares (auth, upload, error handler)
    ├── models/           # Mongoose schemas (User, Video, Like, Comment, etc.)
    ├── routes/           # Express router endpoints
    ├── services/         # Integrations (cloudinary, ffmpeg, video background worker)
    └── utils/            # Helper utilities (error types, checkOwnership)
```

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Configure a `.env` file in the root directory:

| Variable | Description |
| :--- | :--- |
| `PORT` | Local listener port (Default: `8000`). |
| `MONGODB_URI` | Connection URI string for MongoDB. |
| `CORS_ORIGIN` | Allowed HTTP origins (comma-separated). |
| `ACCESS_TOKEN_SECRET` / `EXPIRY` | JWT Access token key & validity duration (e.g. `15m`). |
| `REFRESH_TOKEN_SECRET` / `EXPIRY` | JWT Refresh token key & validity duration (e.g. `30d`). |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Credentials for Cloudinary API. |
| `NODE_ENV` | Run mode (`development` / `production`). |

### Running Locally

```bash
# Development (Nodemon)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication & Profiles (`/api/v1/users`)
* `POST /register` - Register user (uploads avatar/coverImage).
* `POST /login` - Sign in (sets cookies and tokens).
* `POST /logout` - Sign out (invalidates token and clears cookies). *(Auth)*
* `POST /refresh-token` - Rotate access/refresh tokens.
* `POST /change-password` - Update password. *(Auth)*
* `GET /current-user` - Fetch current user model profile. *(Auth)*
* `PATCH /update-account` - Update profile metadata. *(Auth)*
* `PATCH /update-avatar` - Upload new avatar. *(Auth)*
* `PATCH /update-coverImage` - Upload new cover image. *(Auth)*
* `GET /channel/:username` - Retrieve public channel profile. *(Auth)*
* `GET /history` - Fetch user's watch history. *(Auth)*

### Videos (`/api/v1/videos`)
* `GET /` - List videos (paginated search/filter by user).
* `POST /` - Upload video & thumbnail. *(Auth)*
* `GET /:videoId` - Retrieve video metadata (views increment).
* `PATCH /:videoId` - Edit metadata or thumbnail. *(Auth, Owner only)*
* `DELETE /:videoId` - Delete video and cleanup remote files. *(Auth, Owner only)*
* `PATCH /toggle/publish/:videoId` - Toggle visibility. *(Auth, Owner only)*

### Comments, Likes, & Socials
* `/api/v1/comments/:videoId` - `GET` (List comments, paginated) | `POST` (Add comment).
* `/api/v1/comments/c/:commentId` - `DELETE` (Remove comment). *(Auth, Owner only)*
* `/api/v1/likes/toggle/v/:videoId` - Toggle video like. *(Auth)*
* `/api/v1/likes/toggle/c/:commentId` - Toggle comment like. *(Auth)*
* `/api/v1/likes/toggle/t/:tweetId` - Toggle tweet like. *(Auth)*
* `/api/v1/likes/videos` - Get user's liked videos list. *(Auth)*
* `/api/v1/tweets` - `POST` (Post tweet) | `GET` (List user tweets).
* `/api/v1/tweets/:tweetId` - `PATCH` (Edit) | `DELETE` (Remove). *(Auth, Owner only)*

### Playlists & Subscriptions
* `/api/v1/playlist` - `POST` (Create) | `GET /:playlistId` (Get) | `PATCH` & `DELETE` (Edit/Remove). *(Auth, Owner only)*
* `/api/v1/playlist/add/:videoId/:playlistId` - Add video. *(Auth, Owner only)*
* `/api/v1/playlist/remove/:videoId/:playlistId` - Remove video. *(Auth, Owner only)*
* `/api/v1/subscriptions/c/:channelId` - `POST` (Toggle subscribe) | `GET` (List channel subscriptions).
* `/api/v1/subscriptions/u/:channelId` - `GET` (List channel subscribers).

### Creator Dashboard (`/api/v1/dashboard`)
* `GET /stats` - Fetch channel metrics (views, subscribers, uploads, likes). *(Auth)*
* `GET /videos` - Fetch creator's uploaded videos list. *(Auth)*

## Database Schema

* **User**: Profile metadata, credentials, and `watchHistory` (array of `Video` references).
* **Video**: Owner reference, file URLs, and metadata. Uses `mongoose-aggregate-paginate-v2`.
* **Subscription**: Maps `subscriber` (User) to `channel` (User).
* **Like**: Polymorphic map connecting `likedBy` (User) to either `video`, `comment`, or `tweet`.
* **Comment**: Reference to `owner` (User) and `video` (Video) with string content.
* **Playlist**: Reference to `owner` (User) and array of `videos` (Video).
* **Tweet**: Reference to `owner` (User) and string content.

## Deployment

### Docker
Multi-stage build configured in `Dockerfile`:
```bash
docker build -t streamnest-backend:latest .
docker run -d -p 5000:5000 --env-file .env streamnest-backend:latest
```

### Render Integration
* Set proxy trust to parse secure HTTP cookies: `app.set("trust proxy", 1)`.
* HTTP Health checks utilize the `/health` endpoint.

## Challenges & Key Learnings

* **Background Workers**: Spawning video conversion tasks outside the main Express execution loop prevents HTTP connection timeouts and request blockages.
* **Raw HLS Uploads**: Uploading multi-resolution playlist segments requires utilizing `resource_type: "raw"` and matching structural folders on Cloudinary to prevent broken path references.
* **Cross-Origin Cookies**: Setting `sameSite: "none"` and `secure: true` allows cookie sharing behind reverse proxies with cross-origin headers configured dynamically.

## Future Improvements

* **Distributed Job Queue**: Offload FFmpeg operations to BullMQ/Redis.
* **Cascading Deletes**: Mongoose hook triggers to automatically purge orphan comments/likes on parent deletion.
* **HLS CDN Delivery**: Cache segment directories through Cloudflare.

## License

This project is licensed under the ISC License.
