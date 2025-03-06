import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
        console.log("Received Request Body:", req.body);
        console.log("Received Files:", req.files);
        console.log(req.headers)
    
    const {fullname,email,username,password}=req.body;

    //validation
    if ([fullname, email, username, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All text fields are required");
    }
    
    if (!req.files || !req.files.avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const existingUser = await User.findOne({$or: [{email},{username}]});

    if(existingUser){
        throw new ApiError(409,"User already exists");
    }

    console.log(req.files); //to check the files uploaded by the user
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
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
        console.log("Error uploading avatar",error);
        throw new ApiError(500,"Failed to upload avatar");
    }

    let coverImage;
    if(coverLocalPath){
        try {
            coverImage = await uploadOnCloudinary(coverLocalPath);
            console.log("Cover image uploaded successfully");
        } catch (error) {
            console.log("Error uploading cover image",error);
            throw new ApiError(500,"Failed to upload cover image");
        }
    }

    //if the user does not exist, create a new user
    try {
        const user = await User.create({
            fullname,
            avatar:avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken"); //select all fields except password and refreshToken
    
        if(!createdUser){
            throw new ApiError(500,"Something went wrong");
        }
    
        return res
              .status(201)
              .json(new ApiResponse(201,"User created successfully",createdUser));
    } catch (error) {
        console.log("Error creating user",error);
        if(avatar){
            await deleteFromCloudinary(avatar.public_id);
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id);
        }
        throw new ApiError(500,"Something went wrong and images were deleted");
        
    }

});

export{registerUser};