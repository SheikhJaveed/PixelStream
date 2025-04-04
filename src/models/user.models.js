import mongoose, {Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});
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


/** Middleware to encrypt the password */

//"save" is an inbuilt mongoose middleware that is called before saving the document to the database
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // Skip if password not modified
    this.password = await bcrypt.hash(this.password, 10); // Hash the password
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    console.log("Comparison result:", result);
    return result;
};

//access token generation
userSchema.methods.generateAccessToken = function(){
    //short lived access time
    return jwt.sign(
     {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
     }   , process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY});
};

userSchema.methods.generateRefreshToken = function(){
    //long lived access token
    return jwt.sign(
     {
        _id: this._id
     }   , process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY});
};
export const User = mongoose.model("User", userSchema); //mongoose will create a collection called "users" in the database