import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';
import mongoose from "mongoose";

// Extract public_id from Cloudinary URL
function extractPublicIdFromUrl(url) {
    if (!url) return null;
    try {
        // Cloudinary URL format examples:
        // https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
        // https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
        // https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
        
        // Match the path after /upload/ and before the file extension
        // This handles version numbers, folders, and direct public_ids
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (match && match[1]) {
            // Return the full path (including folders) as public_id
            // Cloudinary accepts folder paths as part of public_id
            return match[1];
        }
        return null;
    } catch {
        return null;
    }
}

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { userName, email, password, fullName } = req.body;

    if (
        [fullName, email, userName, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existingUser) {
        throw new ApiError(409, "User already exists with this email or username");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPaths;
    if (
        req.files && Array.isArray(req.files.coverImage)
        && req.files.coverImage.length > 0
    ) {
         coverImageLocalPaths = req.files.coverImage[0].path

    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPaths);

    if (!avatar) {
        throw new ApiError(400, "avatar file is required");

    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        userName: userName.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "User registration failed");
    }

    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    );
})

const loginUser = asyncHandler(async (req, res) => {
    // Login user logic here

    const { userName, email, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { userName }]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await
        generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                "User logged in successfully",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        );

})

const logoutUser = asyncHandler(async (req, res) => {
    // Logout user logic here
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, "User logged out successfully", {})
        );

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request"
        );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await
            generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    "Access token refreshed successfully",
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    }
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
}
)

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully", {})
    );
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse
            (200,
                "Current user fetched successfully",
                req.user));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError('400', "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName, //both works same
                email
            }
        },
        { new: true }
    ).select("-password ");

    return res
        .status(200)
        .json(
            new ApiResponse(200, "User details updated successfully", user)
        );
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError("400", "Avatar file is missing")
    }

    const userForOldAvatr = await User.findById(req.user?._id);
    const oldAvatarUrl = userForOldAvatr?.avatar;
    const oldAvatarPublicId = oldAvatarUrl ? extractPublicIdFromUrl(oldAvatarUrl) : null;

    // Upload new avatar first
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar || !avatar.url) {
        throw new ApiError("400", "Error uploading avatar file")
    }

    // Update user with new avatar URL
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            avatar: avatar.url
        },
        {
            new: true
        }
    ).select("-password")

    // Delete old avatar from Cloudinary after successful update
    if (oldAvatarPublicId) {
        try {
            await deleteFromCloudinary(oldAvatarPublicId, { resource_type: 'image' });
        } catch (error) {
            // Log error but don't fail the request - old image deletion is not critical
            console.error("Failed to delete old avatar from Cloudinary:", error);
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, "Avatar updated successfully", user)
        );
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError("400", "Cover Image file is missing")
    }

    const userForOldCoverImage = await User.findById(req.user?._id);
    const oldCoverImageUrl = userForOldCoverImage?.coverImage;
    const oldCoverImagePublicId = oldCoverImageUrl ? extractPublicIdFromUrl(oldCoverImageUrl) : null;

    // Upload new cover image first
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage || !coverImage.url) {
        throw new ApiError("400", "Error uploading coverImage file")
    }

    // Update user with new cover image URL
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            coverImage: coverImage.url
        },
        {
            new: true
        }
    ).select("-password")

    // Delete old cover image from Cloudinary after successful update
    if (oldCoverImagePublicId) {
        try {
            await deleteFromCloudinary(oldCoverImagePublicId, { resource_type: 'image' });
        } catch (error) {
            // Log error but don't fail the request - old image deletion is not critical
            console.error("Failed to delete old cover image from Cloudinary:", error);
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, "CoverImage updated successfully", user)
        );
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const userName = req.params

    if (!userName?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    userName: userName?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"

                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscriberCount:
                    {
                        $size: "$subscribers"
                    },
                    channelIsSubscribedToCount:
                    {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user_id, "$subscribers.subscriber"] },
                            then: true,
                            else: false

                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    userName: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscriberCount: 1,
                    isSubscribed: 1,
                    channelIsSubscribedToCount: 1



                }

            }
        ])

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(String(req.user?._id))
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [{
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }]
                            }

                        },
                        {
                            $addFields:{
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]

                }
            }
        ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, "Watch history fetched successfully", user[0]?.watchHistory)
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
