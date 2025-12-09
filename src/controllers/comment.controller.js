import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { checkOwnership } from "../utils/checkOwnership.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    // Total comment count for this video
    const totalComments = await Comment.countDocuments({ video: videoId });

    const userId = req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : null;

    const pipeline = [
        { $match: { video: new mongoose.Types.ObjectId(String(videoId)) } },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                ...(userId ? {
                    isLiked: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: "$likes",
                                        as: "like",
                                        cond: {
                                            $eq: [
                                                "$$like.likedBy",
                                                userId
                                            ]
                                        }
                                    }
                                }
                            },
                            0
                        ]
                    }
                } : {
                    isLiked: false
                })
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ];

    const aggregate = Comment.aggregate(pipeline)
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    const result = await Comment.aggregatePaginate(aggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(true, "Comments fetched successfully", {
            totalComments,
            comments: result.docs || result.data || [],
            pagination: {
                page: result.page || 1,
                limit: result.limit || 10,
                totalPages: result.totalPages || 1,
                totalDocs: result.totalDocs || totalComments
            }
        }))




})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    if (!content || content.length===0) {
        throw new ApiError(400, "Comment content is required")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const newComment = new Comment({
        content,
        video: videoId,
        owner: req.user._id
    })
    await newComment.save()

    // Populate owner and add like information
    await newComment.populate('owner')
    const commentObj = newComment.toObject()
    commentObj.likesCount = 0
    commentObj.isLiked = false

    res
        .status(201)
        .json(new ApiResponse(true, "Comment added successfully", commentObj))
})


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    const comment = await checkOwnership(Comment, commentId, req.user._id)

    await comment.deleteOne();
    res
        .status(200)
        .json(new ApiResponse(true, "Comment deleted successfully", null))


})

export {
    getVideoComments,
    addComment,
    deleteComment
}