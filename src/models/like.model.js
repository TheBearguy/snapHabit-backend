import { Schema } from "mongoose";
import mongoose from "mongoose";

const likeSchema = Schema(
     {

        comment: {
            type: Schema.Types.ObjectId, 
            ref: "Comment"
        }, 

        post: {
            type: Schema.Types.ObjectId, 
            ref: "Post"
        }, 

        likedBy: {
            type: Schema.Types.ObjectId, 
            ref: "User"
        }, 
// if we want to add a reference to a tweet
// we can add more third party services
        // tweet: {
        //     type: Schema.Types.ObjectId, 
        //     ref: "Tweet"
        // }

     },
    {timestamps: true}
)

const Like = mongoose.model("Like", likeSchema); 
export default Like;