import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import Comment from "../models/comment.model.js";

const getPostComments = async (req, res) => {
    try {
        // Retrieve all comments for a specific post
        const { postId } = req.params;

        if (!postId) {
            throw new ApiError(400, "Invalid postId");
        }

        const comments = await Comment.aggregate([
            {
                $match: {
                    post: new mongoose.Types.ObjectId(postId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                email: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$owner"
            }
        ]);

        if (!comments || comments.length === 0) {
            throw new ApiError(404, "No comments found for this post");
        }

        return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;

        if (!postId || !req.user._id) {
            throw new ApiError(400, "Invalid postId or user not authenticated");
        }

        const comment = await Comment.create({
            content: content,
            post: postId,
            owner: req.user._id
        });

        if (!comment) {
            throw new ApiError(400, "Comment could not be added");
        }

        return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        if (!commentId) {
            throw new ApiError(400, "Comment ID is required for deletion");
        }

        const deletedComment = await Comment.findOneAndDelete({
            _id: commentId,
            owner: req.user._id
        });

        if (!deletedComment) {
            throw new ApiError(404, "Comment not found or you're not authorized to delete it");
        }

        return res.status(200).json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;

        if (!commentId || !content) {
            throw new ApiError(400, "commentId or content to be updated not provided");
        }

        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content
                }
            },
            { new: true }
        );

        if (!updatedComment) {
            throw new ApiError(404, "Comment update failed, comment not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
    } catch (err) {
        return res.status(err.statusCode || 500).json(new ApiResponse(err.statusCode || 500, null, err.message || "An error occurred"));
    }
};

export {
    getPostComments,
    addComment,
    deleteComment,
    updateComment
}