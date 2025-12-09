import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { checkOwnership } from "../utils/checkOwnership.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    // 1️⃣ Extract channelId from req.params
    // 2️⃣ Validate channelId using isValidObjectId()
    // 3️⃣ Check if a subscription already exists:
    //     const existing = await Subscription.findOne({ subscriber: req.user._id, channel: channelId })
    // 4️⃣ If exists → unsubscribe (delete it)
    //     await Subscription.findByIdAndDelete(existing._id)
    //     return res.status(200).json(new ApiResponse(true, "Unsubscribed successfully"))
    // 5️⃣ Else → subscribe (create new)
    //     const newSub = await Subscription.create({ subscriber: req.user._id, channel: channelId })
    //     return res.status(200).json(new ApiResponse(true, "Subscribed successfully", newSub))

    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id")


    }


    const existing = await Subscription.findOne({ subscriber: req.user._id, channel: channelId })

    if (existing) {
        await  existing.deleteOne();

        return res
            .status(200)
            .json(new ApiResponse(true, "Channel unsubscribed successfully", existing))
    }
    else {
        const newSub = await Subscription.create({ subscriber: req.user._id, channel: channelId })

        return res
            .status(200)
            .json(new ApiResponse(true, "Channel subscribed successfully", newSub))
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // 1️⃣ Extract `channelId` from req.params.
    // 2️⃣ Validate `channelId` using isValidObjectId()
    //     - If invalid → throw new ApiError(400, "Invalid channel ID")
    // 3️⃣ Find all subscriptions where `channel` matches the given channelId
    //     - Use: Subscription.find({ channel: channelId })
    //     - Optionally populate subscriber details (like userName, avatar)
    // 4️⃣ If no subscribers found → return success with empty list
    // 5️⃣ Otherwise, return all subscriber data in response with count
    //     - Include total subscriber count = subscribers.length
    // 6️⃣ Send response with 200 status and message like
    //     "Subscribers fetched successfully"

    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const subscribers = await Subscription.find({channel: channelId})
                                         .populate('subscriber', 'userName avatar')

    console.log(subscribers); //remove after checking

    if(!subscribers){
        return res
                .status(200)
                .json(new ApiResponse(true, "Channel has no subscribers",[]))
    }
    
    const subscribersCount = subscribers.length

    res.status(200).json(new ApiResponse(true, "Subscribers fetched successfully", {
        subscribers,
        subscribersCount
    }))

    


})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    console.log("req.params:", req.params);
console.log("subscriberId:", channelId);

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid subscriber ID")
    }

    const subscribedChannels = await Subscription.find({subscriber: channelId})
                                         .populate('channel', 'userName avatar')

    console.log(subscribedChannels); //remove after checking

    if(!subscribedChannels){
        return res
                .status(200)
                .json(new ApiResponse(true, "User has not subscribed to any channels",[]))
    }
    
    const subscribedChannelsCount = subscribedChannels.length

    res.status(200).json(new ApiResponse(true, "Subscribed channels fetched successfully", {
       subscribedChannels,
       subscribedChannelsCount
    }))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}