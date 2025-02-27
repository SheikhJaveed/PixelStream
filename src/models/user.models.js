import mongoose, {Schema} from "mongoose";

/**
  User schema 
    users [icon: user] {
    id string pk
    username string
    email string
    fullName string
    avatar string
    coverImage string
    watchHistory ObjectId[] videos
    password string
    refreshToken string
    createdAt Date
    updatedAt Date
}
 */

//this user schema is used to define the structure of the user collection in the database
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true //indexing the username field for faster search
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    avatar: {
        type: String, //url to the image
        required: true
    },
    coverImage: {
        type: String, //url to the image
        required: true
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId, //syntax to refer to the id of another document
            ref: "Video" //here "Video" is the name of the collection to which the id refers
        }
    ],
    password: {
        type: String,
        required: [true, "Password is required"], //custom error message
    },
    refreshToken: {
        type: String,
    }   
}, {timestamps: true});
//timestamps: true will automatically add the createdAt and updatedAt fields to the document

export const User = mongoose.model("User", userSchema); //mongoose will create a collection called "users" in the database