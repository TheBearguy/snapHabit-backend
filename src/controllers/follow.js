import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/follow.model.js";
import mongoose from "mongoose";

// Toggle subscription status for a user
const toggleSubscription = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            throw new ApiError(400, "No userId provided");
        }

        const existingSubscription = await Subscription.findOne({
            subscriber: req.user._id,
            channel: userId,
        });

        let isSubscribed;

        if (!existingSubscription) {
            await Subscription.create({
                subscriber: req.user._id,
                channel: userId,
            });
            isSubscribed = true;  // Successfully subscribed
        } else {
            await Subscription.findByIdAndDelete(existingSubscription._id);
            isSubscribed = false; // Unsubscribed
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                { isSubscribed },
                isSubscribed ? "Channel subscribed successfully" : "Channel unsubscribed successfully"
            )
        );
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Server Error" });
    }
};

// Retrieve all subscribers of a specific channel
const getChannelSubscribers = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(userId);
        

        if (!userId) {
            throw new ApiError(400, "No userId provided");
        }

        const channelSubscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriber",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                email: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    subscriber: { $arrayElemAt: ["$subscriber", 0] },
                    createdAt: 1,
                },
            },
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                channelSubscribers,
                "Fetched all channel subscribers"
            )
        );
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Server Error" });
    }
};

// Retrieve all channels the user is subscribed to
const getSubscribedChannels = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            throw new ApiError(400, "Channel ID not found");
        }

        const subscribedChannels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(userId),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channel",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                email: 1,
                                avatar: 1,
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    channel: { $arrayElemAt: ["$channel", 0] },
                    createdAt: 1,
                }
            }
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                subscribedChannels,
                "These are the channels you've subscribed to"
            )
        );
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Server Error" });
    }
};


export {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels
}