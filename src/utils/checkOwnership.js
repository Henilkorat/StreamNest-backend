import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export const checkOwnership = async (Model, resourceId, userId) => {

    if (!mongoose.isValidObjectId(resourceId)) {
        throw new ApiError(400, "Invalid resource ID");
    }

    const resource = await Model.findById(resourceId)

    if (!resource) {
        throw new ApiError(404, `${Model.modelName} not found`)
    }

    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(403, `You are not authorized to modify this ${Model.modelName.toLowerCase()}`);
    }

    return resource
}

