import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    const token = req.cookies.accessToken ||
        req.header("Authorization")?.replace("Bearer ", ""); //this is used to get the token from the header (generally in mobile apps)

    if (!token) {
        throw new ApiError(401, "Unauthorized");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user){
            throw new ApiError(404,"User not found");
        }

        req.user = user; //attaching the user to the request object
        next(); //pass the request to the controller
    } catch (error) {
        throw new ApiError(401, "Unauthorized");
    }
});