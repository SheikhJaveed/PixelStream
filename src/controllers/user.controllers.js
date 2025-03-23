import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import express from "express";
import  mongoose  from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        if (!userId) {
            throw new ApiError(500, "User ID is required");
        }
        // Retrieve the user document from the database
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Call the methods on the actual user object
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        console.log("Access and Refresh Token generated successfully");

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        console.log("Error generating Access and Refresh Token", error);
        throw new ApiError(500, "Failed to generate Access and Refresh Token");
    }
};
const registerUser = asyncHandler(async (req, res) => {
    console.log("Received Request Body:", req.body);
    console.log("Received Files:", req.files);
    console.log(req.headers);

    const { fullname, email, username, password } = req.body;

    //validation
    if ([fullname, email, username, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All text fields are required");
    }

    if (!req.files || !req.files.avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    console.log(req.files); //to check the files uploaded by the user
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    // let coverImage = "";
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudinary(coverLocalPath);
    // }

    //refactored the above code to upload both avatar and cover image in parallel
    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("Avatar uploaded successfully");
    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(500, "Failed to upload avatar");
    }

    let coverImage;
    if (coverLocalPath) {
        try {
            coverImage = await uploadOnCloudinary(coverLocalPath);
            console.log("Cover image uploaded successfully");
        } catch (error) {
            console.log("Error uploading cover image", error);
            throw new ApiError(500, "Failed to upload cover image");
        }
    }

    //if the user does not exist, create a new user
    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken",
        ); //select all fields except password and refreshToken

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong");
        }

        return res
            .status(201)
            .json(
                new ApiResponse(201, "User created successfully", createdUser),
            );
    } catch (error) {
        console.log("Error creating user", error);
        if (avatar) {
            await deleteFromCloudinary(avatar.public_id);
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id);
        }
        throw new ApiError(500, "Something went wrong and images were deleted");
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    //validation
    if (!email && !username) {
        throw new ApiError(400, "Email or Username is required");
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    //validate password
    const isValidPassword = await user.isPasswordCorrect(password);

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong");
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "Login successful",
            ),
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        //check refresh token in DB
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        //generate a token for the user
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        //generate a new access token and refreshToken is named as newRefreshToken to avoid confusion
        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newRefreshToken },
                    "Access Token refreshed successfully",
                ),
            );
    } catch (error) {}
});

const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true }, //return the updated document
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };
    console.log("Logged out successfully");
    
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logout successful"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Retrieve the user document from the database
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the old password is correct
    const isValidPassword = await user.isPasswordCorrect(oldPassword);

    if (!isValidPassword) {
        throw new ApiError(400, "Invalid Password");
    }

    // Update the password
    user.password = newPassword;

    // Save the updated user document (this will trigger the pre('save', ...) middleware)
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "User details fetched successfully"),
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email, username } = req.body;
    const user = await User.findById(req.user?._id);

    if (!email || !fullname || !username) {
        throw new ApiError(400, "Email or Fullname or username is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullname, email, username },
        },
        { new: true },
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Account details updated successfully",
            ),
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path; //path is the key where the file is stored in the req.files object

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    const updatedAvatar = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { avatar: avatar.url },
        },
        { new: true },
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedAvatar, "Avatar updated successfully"),
        );
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path; //path is the key where the file is stored in the req.files object

    if (!coverImagePath) {
        throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImagePath);

    if (!coverImage.url) {
        throw new ApiError(500, "Failed to upload cover image");
    }

    const updatedCoverImage = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { coverImage: coverImage.url },
        },
        { new: true },
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updateCoverImage,
                "Cover image updated successfully",
            ),
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() },
        },
        {
            //this gives us the number of subscribers for a channel
            $lookup: {
                from: "subscriptions",
                localField: "_id", //used to match the field in the user collection and the subscriptions collection
                foreignField: "channel", //we are looking at the channels field in the subscriptions collection to check how many channels a user has subscribed to
                as: "subscribers", //this will be the name of the field that will store the subscribers
            },
            //this gives us the number of channels a user has subscribed to
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers", //$ is used when we have named the field in the previous stage
                },
                channelSubscriptionsCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //checks if the user is subscribed to the channel
                    then: true, //if the user is subscribed to the channel, then return true
                    else: false,
                },
            },
        },
        {
            $project: {
                fullname: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscriptionsCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    console.log("Channel Profile:", channel);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel,
                "Channel profile fetched successfully",
            ),
        );
});
const getWatchHistory = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new ApiError(400, "User ID is missing");
    }
    const watchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(req.user?._id)),
            },
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
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);
    console.log("Watch History:", watchHistory);
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                watchHistory,
                "Watch history fetched successfully"
            )
        );
});
export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logout,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
