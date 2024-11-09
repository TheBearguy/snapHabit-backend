import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import { ApiError } from './ApiError.js';

cloudinary.config( 
    {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    }    
);

const getPublicIdFromUrl = (url) => {
    const parts = url.split('/');
    const lastPart = parts.pop();
    const publicId = lastPart.split('.')[0];
    return publicId;
};

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
         });
        // file has been uploaded successfully
        // console.log("File is uploaded on cloudinary", response.url);
        await fs.unlinkSync(localFilePath);
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the file from local storage as the upload method got failed
    }
}

const deleteFromCloudinary = async (cloudinaryFilePath) => {
    try {
        if (!cloudinaryFilePath)  {
            throw new ApiError(
                400, 
                "Invalid URL of cloudinary asset"
            )
        }
        const publicId = getPublicIdFromUrl(cloudinaryFilePath);
        const response = await cloudinary.uploader.destroy(publicId);
        console.log(response);
        return response;
    } catch (error) {
        throw new ApiError(
            400, 
            error?.message || "Error occured while destroying the asset"
        )
        return null;
    }
}

export {
    uploadOnCloudinary,
    deleteFromCloudinary, 
}