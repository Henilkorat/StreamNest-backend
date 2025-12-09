import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { isValidObjectId } from "mongoose"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelId = req.user._id

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const videoStats = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 }
            }
        }
    ])

    const totalVideos = videoStats[0]?.totalVideos || 0
    const totalViews = videoStats[0]?.totalViews || 0

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    const videoIds = await Video.find({ owner: channelId }).distinct("_id");

    const totalLikes = await Like.countDocuments({ video: { $in: videoIds } })

    const stats = {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalLikes,
    };

    return res
    .status(200)
    .json(new ApiResponse(true, "Channel stats fetched successfully", stats));

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user._id

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const videos = await Video.find({ owner: channelId })
                              .sort({ createdAt: -1 })
                              .populate("owner", "userName email avatar fullName")
                              .lean()
    
    // Get video IDs to count likes
    const videoIds = videos.map(v => v._id)
    
    // Count likes for each video
    const likesCounts = await Like.aggregate([
        { $match: { video: { $in: videoIds } } },
        { $group: { _id: '$video', count: { $sum: 1 } } }
    ])
    
    const likesMap = new Map(likesCounts.map(item => [item._id.toString(), item.count]))
    
    // Add like counts to each video
    const videosWithLikes = videos.map(video => {
        const videoIdStr = video._id.toString()
        video.likes = likesMap.get(videoIdStr) || 0
        return video
    })
                              
    res.status(200).json(new ApiResponse(true, "Channel videos fetched successfully", videosWithLikes))
})

export {
    getChannelStats,
    getChannelVideos
}