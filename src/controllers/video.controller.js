// import mongoose, { isValidObjectId } from "mongoose"
// import { Video } from "../models/video.model.js"
// import { User } from "../models/user.model.js"
// import { Like } from "../models/like.model.js"
// import { ApiError } from "../utils/ApiError.js"
// import { ApiResponse } from "../utils/ApiResponse.js"
// import { asyncHandler } from "../utils/asyncHandler.js"
// import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


// const getAllVideos = asyncHandler(async (req, res) => {
//     const { page = 1, limit = 10, query, sortBy, sortType, userId, userName } = req.query
//     //TODO: get all videos based on query, sort, pagination

//     let ownerId = null

//     if (userName) {
//         const user = await User
//             .findOne({ userName: userName.toLowerCase() })
//             .select('_id')

//         if (!user) {
//             return res
//                 .status(200)
//                 .json(new ApiResponse(false, "User not found"))
//         }

//         ownerId = user._id
//     }

//     //search filter if query or userId is provided
//     const filter = {
//         // ...(userId && isValidObjectId(userId) ? { uploadedBy: new mongoose.Types.ObjectId(String(userId)) } : {}),
//         // ...(query ? { title: { $regex: query, $options: "i" } } : {})

//         ...(userId && isValidObjectId(userId)
//             ? { owner: new mongoose.Types.ObjectId(String(userId)) }
//             : ownerId
//                 ? { owner: ownerId }
//                 : {}),
//         ...(query ? { title: { $regex: query, $options: "i" } } : {})



//     }

//     //sorting logic
//     const sort = {}
//     const allowedSortFields = ["createdAt", "title", "views"]
//     if (sortBy && allowedSortFields.includes(sortBy)) {
//         sort[sortBy] = sortType === "desc" ? -1 : 1
//     } else {
//         sort["createdAt"] = -1 // default sort by createdAt descending
//     }

//     //pagination logic
//     const skip = (parseInt(page) - 1) * parseInt(limit)

//     //fetch videos from db
//     const videos = await Video
//         .find(filter)
//         .sort(sort)
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate("owner", "userName email avatar fullName")
//         .lean()

//     // Get video IDs to count likes
//     const videoIds = videos.map(v => v._id)
    
//     // Count likes for each video
//     const likesCounts = await Like.aggregate([
//         { $match: { video: { $in: videoIds } } },
//         { $group: { _id: '$video', count: { $sum: 1 } } }
//     ])
    
//     const likesMap = new Map(likesCounts.map(item => [item._id.toString(), item.count]))
    
//     // Check which videos the current user has liked (if logged in)
//     let userLikesMap = new Map()
//     if (req.user?._id) {
//         const userLikes = await Like.find({ 
//             video: { $in: videoIds }, 
//             likedBy: req.user._id 
//         }).lean()
//         userLikes.forEach(like => {
//             if (like.video) {
//                 userLikesMap.set(like.video.toString(), true)
//             }
//         })
//     }
    
//     // Add like counts and isLiked to each video
//     const videosWithLikes = videos.map(video => {
//         const videoIdStr = video._id.toString()
//         video.likes = likesMap.get(videoIdStr) || 0
//         video.isLiked = userLikesMap.get(videoIdStr) || false
//         return video
//     })

//     const total = await Video.countDocuments(filter)

//     res.status(200).json(new ApiResponse(true, "Videos fetched successfully", {
//         videos: videosWithLikes,
//         pagination: {
//             total,
//             page: parseInt(page),
//             limit: parseInt(limit),
//             pages: Math.ceil(total / parseInt(limit))
//         }
//     }))






// })

// const publishAVideo = asyncHandler(async (req, res) => {
//     const { title, description } = req.body
//     // TODO: get video, upload to cloudinary, create video

//     const { videoFile, thumbnail } = req.files

//     if (!videoFile || videoFile.length === 0) {
//         throw new ApiError(400, "Video file is required")
//     }
//     if (!thumbnail || thumbnail.length === 0) {
//         throw new ApiError(400, "Thumbnail image is required")
//     }

//     //upload video to cloudinary
//     const videoUploadResult = await uploadOnCloudinary(videoFile[0].path, {
//         folder: "videos",
//         resource_type: "video"
//     })

//     //upload thumbnail to cloudinary
//     const thumbnailUploadResult = await uploadOnCloudinary(thumbnail[0].path, {
//         folder: "thumbnails",
//         resource_type: "image"
//     })

//     if (!videoUploadResult || !videoUploadResult.secure_url) {
//         throw new ApiError(500, "Failed to upload video")
//     }

//     if (!thumbnailUploadResult || !thumbnailUploadResult.secure_url) {
//         throw new ApiError(500, "Failed to upload thumbnail")
//     }

//     //create video document in db
//     const newVideo = new Video({
//         videoFile: videoUploadResult.secure_url,
//         videoPublicId: videoUploadResult.public_id,
//         thumbnail: thumbnailUploadResult.secure_url,
//         thumbnailPublicId: thumbnailUploadResult.public_id,
//         owner: req.user._id,
//         title,
//         description,
//         duration: videoUploadResult.duration,
//         views: 0,
//         isPublished: true
//     })

//     await newVideo.save()

//     res
//         .status(201)
//         .json(new ApiResponse(true, "Video published successfully", newVideo))


// })

// const getVideoById = asyncHandler(async (req, res) => {
//     const { videoId } = req.params;
//     const userId = req.user?._id; // user must be logged in

//     // Validate videoId
//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Invalid video ID");
//     }

//     // Find video with populated owner details
//     const video = await Video.findById(videoId).populate("owner", "userName email avatar fullName").lean();

//     if (!video) {
//         throw new ApiError(404, "Video not found");
//     }

//     // Get like count for this video
//     const likesCount = await Like.countDocuments({ video: videoId });
//     video.likes = likesCount;

//     // Check if current user has liked this video
//     if (userId) {
//         const userLike = await Like.findOne({ video: videoId, likedBy: userId });
//         video.isLiked = !!userLike;
//     } else {
//         video.isLiked = false;
//     }

//     // Increment video views asynchronously (no need to await)
//     Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).exec();

//     // ✅ Add this video to user's watch history (if logged in)
//     if (userId) {
//         await User.findByIdAndUpdate(
//             userId,
//             { $addToSet: { watchHistory: videoId } }, // prevents duplicates
//             { new: true }
//         );
//     }

//     // Send response
//     res.status(200).json(new ApiResponse(true, "Video fetched successfully", video));
// });


// const updateVideo = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     //TODO: update video details like title, description, thumbnail
//     // 1. get videoId from params
//     // 2. validate videoId
//     // 3. find video in db
//     // 4. if not found → 404
//     // 5. check if current user == owner
//     // 6. build update object
//     // 7. if thumbnail uploaded:
//     //     - upload new to cloudinary
//     //         - delete old from cloudinary
//     //             - update thumbnail URL and publicId
//     // 8. update video in db
//     // 9. return updated video

//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Invalid Video ID")
//     }

//     const video = await Video.findById(videoId)

//     if (!video) {
//         throw new ApiError(404, "Video is not found")
//     }

//     if (video.owner.toString() !== req.user._id.toString()) {
//         throw new ApiError(403, "You are not authorized to update this video details")
//     }

//     const updateData = {}
//     const { title, description } = req.body

//     if (title) updateData.title = title
//     if (description) updateData.description = description

//     const thumbnail = req.file?.path

//     if (thumbnail && thumbnail.length > 0) {
//         //upload new thumbnail to cloudinary
//         const thumbnailUploadResult = await uploadOnCloudinary(thumbnail, {
//             folder: "thumbnails",
//             resource_type: "image"
//         })
//         console.log(thumbnailUploadResult);

//         if (!thumbnailUploadResult || !thumbnailUploadResult.secure_url) {
//             throw new ApiError(500, "Failed to upload thumbnail")
//         }
//         if (video.thumbnailPublicId) {
//             await deleteFromCloudinary(video.thumbnailPublicId, { resource_type: 'image' });
//         }

//         updateData.thumbnail = thumbnailUploadResult.secure_url;
//         updateData.thumbnailPublicId = thumbnailUploadResult.public_id;

//     }



//     const updatedVideo = await Video.findByIdAndUpdate(
//         videoId,
//         { $set: updateData },
//         { new: true })
//         .populate("owner", "userName email avatar")

//     res
//         .status(200)
//         .json(new ApiResponse(true, "Video updated successfully", updatedVideo))


// })

// const deleteVideo = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     //TODO: delete video
//     // Get videoId from request params
//     // Validate videoId (check if it’s a valid MongoDB ObjectId)
//     // Find the video by ID in the database
//     // If video not found → throw 404 error
//     // Check if current logged-in user is the same as video.owner
//     // If not → throw 403 (unauthorized) error
//     // Delete video file from Cloudinary using its videoPublicId
//     // Delete thumbnail from Cloudinary using its thumbnailPublicId
//     // Remove video document from MongoDB
//     // Send success response with message “Video deleted successfully”

//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Unvalid Video Id")
//     }

//     const video = await Video.findById(videoId)

//     if (!video) {
//         throw new ApiError(404, "Video not found")
//     }

//     if (video.owner.toString() !== req.user._id.toString()) {
//         throw new ApiError(403, "Unauthorized User")
//     }

//     if (video.videoPublicId) {
//         await deleteFromCloudinary(video.videoPublicId, { resource_type: 'video' })
//     }

//     if (video.thumbnailPublicId) {
//         await deleteFromCloudinary(video.thumbnailPublicId, { resource_type: 'image' })
//     }

//     await Video.findByIdAndDelete(videoId)

//     res
//         .status(200)
//         .json(new ApiResponse(true, "Video deleted successfully"))


// })

// const togglePublishStatus = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     // Steps to toggle publish status of a video:
//     //
//     // 1. Extract videoId from request parameters.
//     // 2. Validate that videoId is a valid MongoDB ObjectId.
//     // 3. Find the video document in the database using the videoId.
//     // 4. If the video doesn't exist, throw a "Video not found" error.
//     // 5. Verify that the logged-in user is the owner of the video.
//     // 6. Toggle the video's `isPublished` field (true ⇄ false).
//     // 7. Save the updated video document back to the database.
//     // 8. Return a success response with a message indicating
//     //    whether the video is now published or unpublished,
//     //    along with the updated video data.

//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Unvalid Video Id")
//     }

//     const video = await Video.findById(videoId)

//     if (!video) {
//         throw new ApiError(404, "Video not found")
//     }

//     if (video.owner.toString() !== req.user._id.toString()) {
//         throw new ApiError(403, "Unauthorized User")
//     }

//     video.isPublished = !video.isPublished

//     await video.save()

//     res
//         .status(200)
//         .json(
//             new ApiResponse(
//                 true, `Video is now ${video.isPublished ? "published" : "unpublished"}`,
//                 video

//             )
//         )


// })

// export {
//     getAllVideos,
//     publishAVideo,
//     getVideoById,
//     updateVideo,
//     deleteVideo,
//     togglePublishStatus
// }

import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    // 1. Destructure and set defaults for query parameters
    const { page = 1, limit = 10, query, sortBy, sortType, userId, userName } = req.query
    
    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)

    let ownerId = null

    // 2. Handle userName query (find user ID)
    if (userName) {
        const user = await User
            .findOne({ userName: userName.toLowerCase() })
            .select('_id')

        if (!user) {
            // Return empty array and pagination info if user doesn't exist
            return res
                .status(200)
                .json(new ApiResponse(true, "Videos fetched successfully", {
                    videos: [],
                    pagination: {
                        total: 0,
                        page: pageNumber,
                        limit: limitNumber,
                        pages: 0
                    }
                }))
        }
        ownerId = user._id
    }

    // 3. Build Search Filter
    const filter = {
        // Find by userId (if provided and valid) OR by ownerId (if found via userName)
        ...(userId && isValidObjectId(userId)
            ? { owner: new mongoose.Types.ObjectId(String(userId)) }
            : ownerId
                ? { owner: ownerId }
                : {}),
        // Find by video title (case-insensitive regex)
        ...(query ? { title: { $regex: query, $options: "i" } } : {})
    }

    // 4. Build Sorting Logic
    const sort = {}
    const allowedSortFields = ["createdAt", "title", "views"]
    if (sortBy && allowedSortFields.includes(sortBy)) {
        sort[sortBy] = sortType === "desc" ? -1 : 1
    } else {
        sort["createdAt"] = -1 // default sort by createdAt descending (newest first)
    }

    // 5. Calculate Skip for Pagination
    const skip = (pageNumber - 1) * limitNumber

    // 6. Fetch Videos
    const videos = await Video
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .populate("owner", "userName email avatar fullName")
        .lean()

    // 7. Calculate Total Documents
    const total = await Video.countDocuments(filter)

    // 8. Video Enrichment: Likes Count and isLiked Status
    const videoIds = videos.map(v => v._id)
    
    // Count likes for all videos in the current batch
    const likesCounts = await Like.aggregate([
        { $match: { video: { $in: videoIds } } },
        { $group: { _id: '$video', count: { $sum: 1 } } }
    ])
    
    const likesMap = new Map(likesCounts.map(item => [item._id.toString(), item.count]))
    
    // Check which videos the current user has liked (if logged in)
    let userLikesMap = new Map()
    if (req.user?._id) {
        const userLikes = await Like.find({ 
            video: { $in: videoIds }, 
            likedBy: req.user._id 
        }).lean()
        userLikes.forEach(like => {
            if (like.video) {
                userLikesMap.set(like.video.toString(), true)
            }
        })
    }
    
    // Attach derived data to each video object
    const videosWithLikes = videos.map(video => {
        const videoIdStr = video._id.toString()
        video.likes = likesMap.get(videoIdStr) || 0
        video.isLiked = userLikesMap.get(videoIdStr) || false
        return video
    })

    // 9. Send Final Response with Paginated Data
    res.status(200).json(new ApiResponse(true, "Videos fetched successfully", {
        videos: videosWithLikes,
        pagination: {
            total: total,
            page: pageNumber,
            limit: limitNumber,
            pages: Math.ceil(total / limitNumber)
        }
    }))
})

const publishAVideo = asyncHandler(async (req, res) => {
// ... (rest of the controller functions are unchanged)
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    const { videoFile, thumbnail } = req.files

    if (!videoFile || videoFile.length === 0) {
        throw new ApiError(400, "Video file is required")
    }
    if (!thumbnail || thumbnail.length === 0) {
        throw new ApiError(400, "Thumbnail image is required")
    }

    //upload video to cloudinary
    const videoUploadResult = await uploadOnCloudinary(videoFile[0].path, {
        folder: "videos",
        resource_type: "video"
    })

    //upload thumbnail to cloudinary
    const thumbnailUploadResult = await uploadOnCloudinary(thumbnail[0].path, {
        folder: "thumbnails",
        resource_type: "image"
    })

    if (!videoUploadResult || !videoUploadResult.secure_url) {
        throw new ApiError(500, "Failed to upload video")
    }

    if (!thumbnailUploadResult || !thumbnailUploadResult.secure_url) {
        throw new ApiError(500, "Failed to upload thumbnail")
    }

    //create video document in db
    const newVideo = new Video({
        videoFile: videoUploadResult.secure_url,
        videoPublicId: videoUploadResult.public_id,
        thumbnail: thumbnailUploadResult.secure_url,
        thumbnailPublicId: thumbnailUploadResult.public_id,
        owner: req.user._id,
        title,
        description,
        duration: videoUploadResult.duration,
        views: 0,
        isPublished: true
    })

    await newVideo.save()

    res
        .status(201)
        .json(new ApiResponse(true, "Video published successfully", newVideo))


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id; // user must be logged in

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Find video with populated owner details
    const video = await Video.findById(videoId).populate("owner", "userName email avatar fullName").lean();

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Get like count for this video
    const likesCount = await Like.countDocuments({ video: videoId });
    video.likes = likesCount;

    // Check if current user has liked this video
    if (userId) {
        const userLike = await Like.findOne({ video: videoId, likedBy: userId });
        video.isLiked = !!userLike;
    } else {
        video.isLiked = false;
    }

    // Increment video views asynchronously (no need to await)
    Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).exec();

    // ✅ Add this video to user's watch history (if logged in)
    if (userId) {
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { watchHistory: videoId } }, // prevents duplicates
            { new: true }
        );
    }

    // Send response
    res.status(200).json(new ApiResponse(true, "Video fetched successfully", video));
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    // 1. get videoId from params
    // 2. validate videoId
    // 3. find video in db
    // 4. if not found → 404
    // 5. check if current user == owner
    // 6. build update object
    // 7. if thumbnail uploaded:
    //    - upload new to cloudinary
    //        - delete old from cloudinary
    //            - update thumbnail URL and publicId
    // 8. update video in db
    // 9. return updated video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video is not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video details")
    }

    const updateData = {}
    const { title, description } = req.body

    if (title) updateData.title = title
    if (description) updateData.description = description

    const thumbnail = req.file?.path

    if (thumbnail && thumbnail.length > 0) {
        //upload new thumbnail to cloudinary
        const thumbnailUploadResult = await uploadOnCloudinary(thumbnail, {
            folder: "thumbnails",
            resource_type: "image"
        })
        console.log(thumbnailUploadResult);

        if (!thumbnailUploadResult || !thumbnailUploadResult.secure_url) {
            throw new ApiError(500, "Failed to upload thumbnail")
        }
        if (video.thumbnailPublicId) {
            await deleteFromCloudinary(video.thumbnailPublicId, { resource_type: 'image' });
        }

        updateData.thumbnail = thumbnailUploadResult.secure_url;
        updateData.thumbnailPublicId = thumbnailUploadResult.public_id;

    }



    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true })
        .populate("owner", "userName email avatar")

    res
        .status(200)
        .json(new ApiResponse(true, "Video updated successfully", updatedVideo))


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    // Get videoId from request params
    // Validate videoId (check if it’s a valid MongoDB ObjectId)
    // Find the video by ID in the database
    // If video not found → throw 404 error
    // Check if current logged-in user is the same as video.owner
    // If not → throw 403 (unauthorized) error
    // Delete video file from Cloudinary using its videoPublicId
    // Delete thumbnail from Cloudinary using its thumbnailPublicId
    // Remove video document from MongoDB
    // Send success response with message “Video deleted successfully”

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Unvalid Video Id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized User")
    }

    if (video.videoPublicId) {
        await deleteFromCloudinary(video.videoPublicId, { resource_type: 'video' })
    }

    if (video.thumbnailPublicId) {
        await deleteFromCloudinary(video.thumbnailPublicId, { resource_type: 'image' })
    }

    await Video.findByIdAndDelete(videoId)

    res
        .status(200)
        .json(new ApiResponse(true, "Video deleted successfully"))


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // Steps to toggle publish status of a video:
    //
    // 1. Extract videoId from request parameters.
    // 2. Validate that videoId is a valid MongoDB ObjectId.
    // 3. Find the video document in the database using the videoId.
    // 4. If the video doesn't exist, throw a "Video not found" error.
    // 5. Verify that the logged-in user is the owner of the video.
    // 6. Toggle the video's `isPublished` field (true ⇄ false).
    // 7. Save the updated video document back to the database.
    // 8. Return a success response with a message indicating
    //    whether the video is now published or unpublished,
    //    along with the updated video data.

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Unvalid Video Id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized User")
    }

    video.isPublished = !video.isPublished

    await video.save()

    res
        .status(200)
        .json(
            new ApiResponse(
                true, `Video is now ${video.isPublished ? "published" : "unpublished"}`,
                video

            )
        )


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}