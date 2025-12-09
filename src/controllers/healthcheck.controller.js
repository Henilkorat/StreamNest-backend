import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose"

const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    //Check database connection state
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    //Build response data
    const healthData = {
        status: "OK",
        message: "Server is healthy 🚀",
        database: dbStatus,
        timestamp: new Date().toISOString(),
    };

    //Return success response
    return res
        .status(200)
        .json(new ApiResponse(true, "Healthcheck successful", healthData));
})

export {
    healthcheck
}
