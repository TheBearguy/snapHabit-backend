import User from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Post from '../models/post.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { upload } from '../middlewares/multer.middleware.js';
import axios from 'axios';
import { getEnvironmentalScore } from './genai.controller.js';


//! Get all posts for a specific user FOR PROFILE PAGE
const allPosts = async (req, res) => {
    try {
        const { page = '1', limit = '10', sortBy, sortType, query, userId } = req.query;

        // Ensure user is authenticated
        if (!userId) {
            throw new ApiError(400, "User not found");
        }

        // If query is provided, check for valid search
        // if (query) {
        //     throw new ApiError(400, "No Query provided");
        // }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        // Sorting criteria setup
        const sortingCriteria = {};
        if (sortBy) {
            sortingCriteria[sortBy] = sortType === 'asc' ? 1 : -1;
        }

        // Search criteria based on user ID and optional query (title or content search)
        const searchPost = {
            owner: userId,
            // $or: [
            //     { title: { $regex: new RegExp(query, 'i') } },
            //     { content: { $regex: new RegExp(query, 'i') } },
            // ]
        };

        const posts = await Post.find(searchPost)
            // .sort(sortingCriteria)
            // .skip((pageNumber - 1) * limitNumber)
            // .limit(limitNumber);
        
            console.log(posts);
            

        if (!posts.length) {
            throw new ApiError(400, "No posts found or error occurred while getting posts");
        }

        return res.status(200).json(new ApiResponse(200, posts, "All Posts Fetched Successfully"));
    } catch (error) {
        // Handle errors
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        // For unexpected errors
        return res.status(500).json({ message: "An error occurred" });
    }
};
// Publish a new post
const publishAPost = async (req, res) => {
        const { title, caption } = req.body;

        if (!title) {
            throw new ApiError(400, "No post title found");
        }

        // if (!content) {
        //     throw new ApiError(400, "No post content found");
        // }

        if (!caption) {
            throw new ApiError(400, "No post caption found");
        }

        const contentFilePath = req.files?.content[0]?.path;

        if (!contentFilePath) {
            throw new ApiError(400, "No content file found");
        }

        // Upload content to Cloudinary
        const uploadedContent = await uploadOnCloudinary(contentFilePath, {
            resource_type: "image",
        });

        if (!uploadedContent) {
            throw new ApiError(401, "Content couldn't be uploaded to Cloudinary");
        }

        console.log("hello it is starting");
        
        const genAIAnswer = await getEnvironmentalScore(title, caption);
        // console.log(genAIAnswer);
        // console.log("hello, it ended");
            // Create new post
        const post = new Post({
            title,
            content: uploadedContent.url,
            caption,
            score: genAIAnswer,
            owner: req.user?._id, // Assign owner to the logged-in user
        });        
        
        await post.save();

        return res.status(200).json(new ApiResponse(200, post, "Post Uploaded Successfully"));
};

// Get a post by its ID
const getPostById = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate the postId parameter
        if (!postId) {
            throw new ApiError(400, "Invalid postId");
        }

        // Fetch the post by ID
        const post = await Post.findById(postId);

        if (!post) {
            throw new ApiError(400, "Post not found");
        }

        return res.status(200).json(new ApiResponse(200, post, "Post Fetched Successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Update a post
const updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, caption } = req.body;

        // Ensure title or caption is provided for update
        if (!title && !caption) {
            throw new ApiError(400, "No title or caption found");
        }

        // Handle content update (requires a new content file)
        const contentFilePath = req.files?.content[0]?.path;
        if (!contentFilePath) {
            throw new ApiError(400, "No content found to update");
        }

        // Fetch the post by ID to ensure it exists before updating
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(400, "Post not found");
        }

        // If content exists, delete it from Cloudinary
        if (post.content) {
            const oldContentCloudinaryUrl = post.content;
            await deleteFromCloudinary(oldContentCloudinaryUrl);
        }

        // Upload the new content to Cloudinary
        const content = await uploadOnCloudinary(contentFilePath);

        if (!content.url) {
            throw new ApiError(400, "Content couldn't be uploaded to Cloudinary");
        }

        // Update the post with the new title, caption, and content URL
        post.title = title || post.title;
        post.caption = caption || post.caption;
        post.content = content.url;

        await post.save();

        return res.status(200).json(new ApiResponse(200, post, "Post Updated Successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Delete a post
const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            throw new ApiError(400, "Could not find postId for deletion");
        }

        // Attempt to delete the post
        const deletedPost = await Post.findByIdAndDelete(postId);

        if (!deletedPost) {
            throw new ApiError(400, "Post not found or could not be deleted");
        }

        return res.status(200).json(new ApiResponse(200, "Post deleted successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Toggle post publication status
const toggleIsPublished = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            throw new ApiError(400, "PostId is missing");
        }

        // Fetch the post to toggle its publication status
        const post = await Post.findById(postId);

        if (!post) {
            throw new ApiError(400, "Post not found");
        }

        post.isPublished = !post.isPublished;
        await post.save();

        return res.status(200).json(new ApiResponse(200, post, "Post publication status updated"));
    } catch (error) {
        handleError(error, res);
    }
};


const addAPostFromExploreToUser = async (req, res) => {
    try {
        const {postId} = req.params; 
        const response = await axios(`http://localhost:3000/post/${postId}`); 
        console.log(response.data.data);
        
        const title = response.data.data.title; 
        const content = response.data.data.content; 
        const caption = response.data.data.caption;


        if (!title) {
            throw new ApiError(400, "No post title found to add to the profile");
        }
        // content is cloduinary url string
        if (!content) {
            throw new ApiError(400, "No post content found to add to the profile");
        }

        if (!caption) {
            throw new ApiError(400, "No post caption found to add to the profile");
        }
        // Create new post
        const post = new Post({
            title,
            content,
            caption,
            owner: req.user?._id, // Assign owner to the logged-in user
        });

        await post.save();

        return res.status(200).json(new ApiResponse(200, post, "Post added to the Profile Successfully"));


    } catch (error) {
        throw new ApiError(500, error.message);
    }
}





// Helper function to handle errors
const handleError = (error, res) => {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "An error occurred" });
};

export {
    allPosts,
    publishAPost,
    getPostById,
    updatePost,
    deletePost,
    toggleIsPublished, 
    addAPostFromExploreToUser
}