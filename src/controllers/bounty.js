import User from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// import bounty from '../models/bounty.model.js';
import Bounty from '../models/bounty.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { upload } from '../middlewares/multer.middleware.js';
import axios from 'axios';
import { getEnvironmentalScore } from './genai.controller.js';


//! Get all bounties for a specific user FOR PROFILE PAGE
const allBounty = async (req, res) => {
    try {
        const { page = '1', limit = '10', sortBy, sortType, query, userId } = req.query;

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        // Sorting criteria setup
        const sortingCriteria = {};
        if (sortBy) {
            sortingCriteria[sortBy] = sortType === 'asc' ? 1 : -1;
        }

        const bounty = await Bounty.find();
            // .sort(sortingCriteria)
            // .skip((pageNumber - 1) * limitNumber)
            // .limit(limitNumber);
        
            console.log(bounty);
            

        if (!bounty.length) {
            throw new ApiError(400, "No bountys found or error occurred while getting bounty");
        }

        return res.status(200).json(new ApiResponse(200, bounty, "All bounty Fetched Successfully"));
    } catch (error) {
        // Handle errors
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        // For unexpected errors
        return res.status(500).json({ message: "An error occurred" });
    }
};
// Publish a new bounty
const publishABounty = async (req, res) => {
        const { title, description, score, minScoreRequired} = req.body;

        if (!title) {
            throw new ApiError(400, "No bounty title found");
        }

        // if (!content) {
        //     throw new ApiError(400, "No bounty content found");
        // }

        if (!description) {
            throw new ApiError(400, "No bounty description found");
        }

        if (!minScoreRequired) {
            throw new ApiError(400, "No threshold score found");
        }

        if (!score) {
            throw new ApiError(400, "No score found");
        }

        const contentFilePath = req.files?.content[0]?.path;
        console.log(contentFilePath);
        
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

        // console.log("hello it is starting");
        
        // const genAIAnswer = await getEnvironmentalScore(title, description);
        // console.log(genAIAnswer);
        // console.log("hello, it ended");
            // Create new bounty
        const bounty = new Bounty({
            title,
            content: uploadedContent.url,
            description,
            score,
            minScoreRequired,
            owner: req.user?._id, // Assign owner to the logged-in user
        });        
        
        await bounty.save();

        return res.status(200).json(new ApiResponse(200, bounty, "Bounty Uploaded Successfully"));
};

// Get a bounty by its ID
const getBountyById = async (req, res) => {
    try {
        const { bountyId } = req.params;

        // Validate the bountyId parameter
        if (!bountyId) {
            throw new ApiError(400, "Invalid bountyId");
        }

        // Fetch the bounty by ID
        const bounty = await Bounty.findById(bountyId);

        if (!bounty) {
            throw new ApiError(400, "Bounty not found");
        }

        return res.status(200).json(new ApiResponse(200, bounty, "Bounty Fetched Successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Update a bounty
const updateBounty = async (req, res) => {
    try {
        const { bountyId } = req.params;
        const { title, description } = req.body;

        // Ensure title or description is provided for update
        if (!title && !description) {
            throw new ApiError(400, "No title or description found");
        }

        // Handle content update (requires a new content file)
        const contentFilePath = req.files?.content[0]?.path;
        if (!contentFilePath) {
            throw new ApiError(400, "No content found to update");
        }

        // Fetch the bounty by ID to ensure it exists before updating
        const bounty = await Bounty.findById(bountyId);
        if (!bounty) {
            throw new ApiError(400, "Bounty not found");
        }

        // If content exists, delete it from Cloudinary
        if (bounty.content) {
            const oldContentCloudinaryUrl = bounty.content;
            await deleteFromCloudinary(oldContentCloudinaryUrl);
        }

        // Upload the new content to Cloudinary
        const content = await uploadOnCloudinary(contentFilePath);

        if (!content.url) {
            throw new ApiError(400, "Content couldn't be uploaded to Cloudinary");
        }

        // Update the bounty with the new title, description, and content URL
        bounty.title = title || bounty.title;
        bounty.description = description || bounty.description;
        bounty.content = content.url;

        await bounty.save();

        return res.status(200).json(new ApiResponse(200, bounty, "bounty Updated Successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Delete a bounty
const deletebounty = async (req, res) => {
    try {
        const { bountyId } = req.params;

        if (!bountyId) {
            throw new ApiError(400, "Could not find bountyId for deletion");
        }

        // Attempt to delete the bounty
        const deletedbounty = await Bounty.findByIdAndDelete(bountyId);

        if (!deletedbounty) {
            throw new ApiError(400, "bounty not found or could not be deleted");
        }

        return res.status(200).json(new ApiResponse(200, "bounty deleted successfully"));
    } catch (error) {
        handleError(error, res);
    }
};

// Toggle bounty publication status
const toggleIsPublished = async (req, res) => {
    try {
        const { bountyId } = req.params;

        if (!bountyId) {
            throw new ApiError(400, "bountyId is missing");
        }

        // Fetch the bounty to toggle its publication status
        const bounty = await Bounty.findById(bountyId);

        if (!bounty) {
            throw new ApiError(400, "bounty not found");
        }

        bounty.isPublished = !bounty.isPublished;
        await bounty.save();

        return res.status(200).json(new ApiResponse(200, bounty, "bounty publication status updated"));
    } catch (error) {
        handleError(error, res);
    }
};


// const addAbountyFromExploreToUser = async (req, res) => {
//     try {
//         const {bountyId} = req.params; 
//         const response = await axios(`http://localhost:3000/bounty/${bountyId}`); 
//         console.log(response.data.data);
        
//         const title = response.data.data.title; 
//         const content = response.data.data.content; 
//         const description = response.data.data.description;


//         if (!title) {
//             throw new ApiError(400, "No bounty title found to add to the profile");
//         }
//         // content is cloduinary url string
//         if (!content) {
//             throw new ApiError(400, "No bounty content found to add to the profile");
//         }

//         if (!description) {
//             throw new ApiError(400, "No bounty description found to add to the profile");
//         }
//         // Create new bounty
//         const bounty = new bounty({
//             title,
//             content,
//             description,
//             owner: req.user?._id, // Assign owner to the logged-in user
//         });

//         await bounty.save();

//         return res.status(200).json(new ApiResponse(200, bounty, "bounty added to the Profile Successfully"));


//     } catch (error) {
//         throw new ApiError(500, error.message);
//     }
// }





// Helper function to handle errors
const handleError = (error, res) => {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "An error occurred" });
};

export {
    allBounty,
    publishABounty,
    getBountyById,
    updateBounty,
    deletebounty,
    toggleIsPublished, 
    // addAbountyFromExploreToUser
}