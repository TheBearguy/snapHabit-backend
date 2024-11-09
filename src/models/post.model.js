import mongoose from "mongoose";
import { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema =  new Schema({
    title: {
        type: String,
        required: true
    },
    //content can be a string or an array of strings
    //content is reffering to the mime data stored in cloudinary or firebase
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    caption: {
        type: String,
        required: true
    },
    views: {
        type: Number, 
        default: 0
    }, 
    isPublished: {
        type: Boolean, 
        default: true
    }, 
    score: {
        type: Number, 
    }, 
    isCompleted: {
        type: Boolean, 
        default: false
    }
}, {timestamps: true});

postSchema.plugin(mongooseAggregatePaginate); 

const Post = mongoose.model("Post", postSchema);
export default Post;