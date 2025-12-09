import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id })
    if (existingLike) {

        await existingLike.deleteOne()

        res.json(new ApiResponse(true, "Unliked the video"))
        return
    }
    else {
        const newLike = new Like({
            video: videoId,
            likedBy: req.user._id
        })
        await newLike.save()

        res.json(new ApiResponse(true, "Liked the video"))
        return
    }

    res.json(new ApiResponse(true, "Toggled like on video"))


})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id })
    if (existingLike) {
        await existingLike.deleteOne()
        res.json(new ApiResponse(true, "Unliked the comment"))
        return
    }
    else {
        const newLike = new Like({
            comment: commentId,
            likedBy: req.user._id
        })
        await newLike.save()
        res.json(new ApiResponse(true, "Liked the comment"))
        return
    }



})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })
    if (existingLike) {
        await existingLike.deleteOne()
        res.json(new ApiResponse(true, "Unliked the tweet"))
        return
    }
    else {
        const newLike = new Like({
            tweet: tweetId,
            likedBy: req.user._id
        })
        await newLike.save()
        res.json(new ApiResponse(true, "Liked the tweet"))
        return
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideos = await Like.find({ likedBy: req.user._id, video: { $ne: null } })
        .populate({
            path: 'video',
            populate: {
                path: 'owner',
                select: 'userName email avatar fullName'
            }
        })
        .sort({ createdAt: -1 })
        .lean()

    // Get video IDs to count likes for each video
    const videoIds = likedVideos.map(like => like.video?._id).filter(Boolean)
    
    // Count likes for each video
    const likesCounts = await Like.aggregate([
        { $match: { video: { $in: videoIds } } },
        { $group: { _id: '$video', count: { $sum: 1 } } }
    ])
    
    const likesMap = new Map(likesCounts.map(item => [item._id.toString(), item.count]))
    
    // Add like counts to videos
    const videosWithLikes = likedVideos.map(like => {
        const video = like.video
        if (video && video._id) {
            video.likes = likesMap.get(video._id.toString()) || 0
            video.isLiked = true // User has liked this video
        }
        return like
    })

    res
        .status(200)
        .json(new ApiResponse(true, "Liked videos fetched successfully", {
            total: likedVideos.length,
            videos: videosWithLikes
        }))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}