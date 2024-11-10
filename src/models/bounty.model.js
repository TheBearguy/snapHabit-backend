import { title } from "errorhandler";
import mongoose from "mongoose";

const bountySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Bounty title is mandatory"]
    }, 
    description: {
        type: String,
        required: [true, "Bounty description is mandatory"]
    },
    content: {
        type: String,
        required: [true, "Bounty image is mandatory"]
    }, 
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
     
    isCompleted: {
        type: Boolean, 
        default: false
    },
    score: {
        type: Number, 
        default: 0
    }, 
    minScoreRequired: {
        type: Number, 
        default: 0
    }
}, {timestamps: true});

const Bounty = mongoose.model("Bounty", courseSchema);
export default Bounty;