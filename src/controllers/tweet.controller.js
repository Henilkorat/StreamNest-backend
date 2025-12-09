import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { checkOwnership } from "../utils/checkOwnership.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Content is required")
    }

    const newTweet = new Tweet({
        content: content.trim(),
        owner: req.user._id
    })

    await newTweet.save()

    res
        .status(201)
        .json(new ApiResponse(true, "Tweet created successfully", newTweet))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id")
    }

    const user = await User.exists({ _id: userId })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const tweets = await Tweet
        .find({ owner: userId })
        .sort({ createdAt: -1 })
        .populate('owner', 'userName email avatar')
        .lean()

    return res
        .status(200)
        .json(new ApiResponse(true, "User tweets fetched successfully", tweets))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Content is required")
    }

    const tweet = await checkOwnership(Tweet, tweetId, req.user._id)

    tweet.content = content.trim()
    await tweet.save()

    res
        .status(200)
        .json(new ApiResponse(true, "Tweet updated successfully", tweet))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params

    const tweet = await checkOwnership(Tweet, tweetId, req.user._id)

    await tweet.remove

    res
        .status(200)
        .json(new ApiResponse(true, "Tweet deleted successfully", null))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}