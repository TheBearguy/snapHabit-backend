import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Like  from "../models/like.model.js";

// Toggle like on a video
const toggleVideoLike = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            throw new ApiError(400, "PostId is wrong or not found");
        }

        // Check if the user has already liked the post
        const existingLike = await Like.findOne({ post: postId, likedBy: req.user._id });

        let isVideoLiked;
        if (!existingLike) {
            // If not liked, add a like
            const newLike = await Like.create({ post: postId, likedBy: req.user._id });
            if (!newLike) {
                throw new ApiError(400, "Like could not be added");
            }
            isVideoLiked = true; // Video is now liked
        } else {
            // If already liked, remove the like
            await Like.findByIdAndDelete(existingLike._id);
            isVideoLiked = false; // Video is now unliked
        }

        return res.status(200).json(
            new ApiResponse(200, isVideoLiked, isVideoLiked ? "Video liked successfully" : "Video unliked successfully")
        );
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

// Toggle like on a comment
const toggleCommentLike = async (req, res) => {
    try {
        const { commentId } = req.params;

        if (!commentId) {
            throw new ApiError(400, "Invalid Comment Id provided");
        }

        // Check if the user has already liked the comment
        const existingLike = await Like.findOne({ commentId, likedBy: req.user._id });

        let isCommentLiked;
        if (!existingLike) {
            // If not liked, add a like
            const newLike = await Like.create({ commentId, likedBy: req.user._id });
            if (!newLike) {
                throw new ApiError(400, "Like could not be added");
            }
            isCommentLiked = true; // Comment is now liked
        } else {
            // If already liked, remove the like
            await Like.findByIdAndDelete(existingLike._id);
            isCommentLiked = false; // Comment is now unliked
        }

        return res.status(200).json(
            new ApiResponse(200, isCommentLiked, isCommentLiked ? "Comment liked successfully" : "Comment unliked successfully")
        );
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

// Toggle like on a community post
const toggleCommunityPostLike = async (req, res) => {
    try {
        const { postId } = req.params;
        if (!postId) {
            throw new ApiError(400, "Post ID is missing");
        }

        // Check if the user has already liked the community post
        const existingLike = await Like.findOne({ community: postId, likedBy: req.user._id });

        let isCommunityLiked;
        if (!existingLike) {
            // If not liked, create a like
            const newLike = await Like.create({ community: postId, likedBy: req.user._id });
            if (!newLike) {
                throw new ApiError(400, "Error while liking post");
            }
            isCommunityLiked = true;
        } else {
            // If already liked, remove the like
            await Like.findByIdAndDelete(existingLike._id);
            isCommunityLiked = false;
        }

        return res.status(200).json(new ApiResponse(200, { isCommunityLiked }, "Community like status updated"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

// Get all liked posts for the user
const getAllLikedPosts = async (req, res) => {
    try {
        const likedPosts = await Like.find({
            likedBy: req.user._id,
            post: { $ne: null }
        }).populate("post");

        if (!likedPosts || likedPosts.length === 0) {
            throw new ApiError(404, "No liked posts found");
        }

        return res.status(200).json(new ApiResponse(200, likedPosts, "Liked posts fetched successfully"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

// Uncomment and use if needed in the future for liked videos
// const getAllLikedVideos = async (req, res) => {
//     try {
//         const likedVideos = await Like.find({
//             likedBy: req.user._id,
//             video: { $ne: null }
//         }).populate("video");

//         if (!likedVideos || likedVideos.length === 0) {
//             throw new ApiError(404, "No liked videos found");
//         }

//         return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
//     } catch (err) {
//         return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
//     }
// };

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleCommunityPostLike,
    getAllLikedPosts
    // getAllLikedVideos
};