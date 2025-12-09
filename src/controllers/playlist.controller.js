import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { checkOwnership } from "../utils/checkOwnership.js"


const createPlaylist = asyncHandler(async (req, res) => {
   const {name, description } = req.body

    if (!name) {
        throw new ApiError(400, "Playlist name is required")
    }

    const newPlaylist = new Playlist({
        name,
        description,
        owner: req.user._id
    })
    await newPlaylist.save()

    res
        .status(201)
        .json(
            new ApiResponse(
                true,
                "Playlist created successfully",
                newPlaylist
            )
        )


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    // 1. Extract `userId` from request params
    // 2. Validate that the `userId` is a valid MongoDB ObjectId
    //    → If invalid, throw ApiError(400, "Invalid user ID")

    // 3. Query the database to find all playlists where `owner` = userId
    //    → Use `.populate("videos", "title thumbnail")`
    //    → Use `.populate("owner", "userName email avatar")`
    //    (This gives more detailed data for frontend display)

    // 4. If no playlists are found, respond with a success message but empty array
    //    (Don't throw error — empty playlists are a valid state)

    // 5. Return a 200 response using ApiResponse with the list of playlists
    //    Example structure:
    //    {
    //        success: true,
    //        message: "Playlists fetched successfully",
    //        data: playlists
    //    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const playlists = await Playlist.find({ owner: userId })
        .populate("videos", "title thumbnail")
        .populate("owner", "userName email avatar")

    if (!playlists) {
        return res
            .status(200)
            .json(new ApiResponse(true, "Playlists fetched successfully", []))
    }

    res
        .status(200)
        .json(new ApiResponse(true, "Playlists fetched successfully", playlists))


})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    // 1️⃣ Extract `playlistId` from req.params.
    // 2️⃣ Validate `playlistId`.
    //     - Use isValidObjectId(playlistId).
    //     - If invalid → throw new ApiError(400, "Invalid playlist ID")
    // 3️⃣ Find playlist in DB by ID
    //     - Use Playlist.findById(playlistId)
    //     - Use .populate("videos", "title thumbnail duration") → show videos' key info
    //     - Use .populate("owner", "userName email avatar") → show playlist owner's info
    // 4️⃣ If no playlist found → throw new ApiError(404, "Playlist not found")
    // 5️⃣ Return 200 success response with playlist data inside ApiResponse
    //     Example structure:
    //     {
    //       success: true,
    //       message: "Playlist fetched successfully",
    //       data: playlist
    //     }

    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            select: "title thumbnail duration views videoFile videoUrl",
            populate: {
                path: "owner",
                select: "userName email avatar fullName"
            }
        })
        .populate("owner", "userName email avatar")

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    res
        .status(200)
        .json(new ApiResponse(true, "Playlist fetched successfully", playlist))



})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // 1️⃣ Extract `playlistId` and `videoId` from req.params.
    // 2️⃣ Validate both IDs using isValidObjectId().
    //     - If either invalid → throw new ApiError(400, "Invalid playlist or video ID")
    // 3️⃣ Fetch the playlist from DB.
    //     - Playlist.findById(playlistId)
    //     - If not found → throw ApiError(404, "Playlist not found")
    // 4️⃣ Check if the current logged-in user owns this playlist.
    //     - if (playlist.owner.toString() !== req.user._id.toString())
    //         → throw ApiError(403, "You are not authorized to modify this playlist")
    // 5️⃣ Check if the video exists in the DB.
    //     - Video.findById(videoId)
    //     - If not found → throw ApiError(404, "Video not found")
    // 6️⃣ Check if the video is already in the playlist.
    //     - if (playlist.videos.includes(videoId))
    //         → throw ApiError(400, "Video already in playlist")
    // 7️⃣ Add the videoId to the playlist.videos array.
    //     - playlist.videos.push(videoId)
    // 8️⃣ Save the playlist document.
    //     - await playlist.save()
    // 9️⃣ Return a success response (200) with updated playlist data.
    //     Example:
    //     {
    //       success: true,
    //       message: "Video added to playlist successfully",
    //       data: updatedPlaylist
    //     }

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlistId or videoId")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to modify this playlist")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already in playlist")
    }

    playlist.videos.push(videoId)

    await playlist.save()

    res
        .status(200)
        .json(new ApiResponse(true, "Video added to playlist successfully", playlist))


})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    //1. Extract playlistId and videoId from req.params
    //2. Validate both IDs using isValidObjectId()
    //   - If invalid → throw ApiError(400, "Invalid playlist or video ID")
    //3. Find playlist by playlistId
    //   - If not found → throw ApiError(404, "Playlist not found")
    //4. Check if the logged-in user is the owner of this playlist
    //   - If not → throw ApiError(403, "You are not authorized to modify this playlist")
    //5. Check if the video exists in playlist.videos array
    //   - If not → throw ApiError(404, "Video not found in this playlist")
    //6. Remove the videoId from playlist.videos array using filter or splice
    //7. Save the updated playlist document
    //8. Return a success response with a message like "Video removed from playlist successfully"
    //   - Include the updated playlist data in the response

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist or Video Id")
    }

    const playlist = await Playlist.findById(playlistId)


    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to modify this playlist")
    }

    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(404, "Video not found in this playlist")
    }

    playlist.videos = playlist.videos.filter(
        (id) => id.toString() !== videoId.toString()
    )

    await playlist.save()

    res
        .status(200)
        .json(new ApiResponse(200, "Video removed from playlist successfully", playlist))


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    // 1️⃣ Check if playlistId is valid (MongoDB ObjectId check)
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    // 2️⃣ Find the playlist
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // 3️⃣ Verify ownership (security check)
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    // 4️⃣ Delete playlist
    await Playlist.findByIdAndDelete(playlistId);

    // 5️⃣ Send success response
    return res.status(200).json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    );



})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
   
    const playlist = await checkOwnership(Playlist, playlistId, req.user._id);

    // ✅ Update
    playlist.name = name || playlist.name;
    playlist.description = description || playlist.description;

    await playlist.save();
    
    res
    .status(200)
    .json(new ApiResponse(200, "Playlist details updated successfully", playlist))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}