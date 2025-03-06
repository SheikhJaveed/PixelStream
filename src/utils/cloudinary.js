import {v2 as cloudinary} from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
//configure cloudinary
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath)  return null;
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type:"auto"
            }
        )
        console.log("File uploaded to cloudinary, File src:",response.url);
        //once the file is uploaded to cloudinary, delete the file from the local storage
        fs.unlinkSync(localFilePath);
        return response;
    }catch(error){
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (publicId)=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("delete from cloudinary",publicId);

    } catch (error) {
        console.log("Error deleting file from cloudinary",error);
        return null;
    }
};
export {uploadOnCloudinary,deleteFromCloudinary};