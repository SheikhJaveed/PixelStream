import mongoose, {Schema} from "mongoose";

/**
    Playlist schema:
        id string pk
        owner ObjectId users
        videos ObjectId[] videos
        title string
        description string
        createdAt Date
        updatedAt Date
    }
 */

const playListSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true});

export const Playlist = mongoose.model("Playlist",playListSchema); 