import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

/**
    comments [icon: comment] {
        id string pk
        video ObjectId videos
        owner ObjectId users
        content string
        createdAt Date
        updatedAt Date
}
 */
const commentSchema = new Schema({
    content:{
        type: String,
        required: true
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true});

commentSchema.plugin(mongooseAggregatePaginate); // pagination plugin

export const Comment = mongoose.model("Comment",commentSchema);