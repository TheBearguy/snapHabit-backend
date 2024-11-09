import axios from 'axios';
import vision  from '@google-cloud/vision';
import multer from 'multer';
// Create a client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './google-cloud-visionAI-key.json'
});

// async function getFaceFeaturesFromBuffer(imageBuffer) {
//     try {
//         // Properly specify the request with image and features
//         const request = {
//             image: {
//                 content: imageBuffer.toString('base64')  // Convert to base64 string
//             },
//             features: [
//                 {
//                     type: 'FACE_DETECTION',
//                     maxResults: 1
//                 }
//             ]
//         };
        

//         const [result] = await client.annotateImage(request);
//         const faces = result.faceAnnotations;

//         if (!faces || faces.length === 0) {
//             return null;
//         }

//         // Get the first (most prominent) face
//         const face = faces[0];

//         // Extract key facial landmarks
//         const landmarks = {
//             leftEye: {
//                 x: face.landmarks.find(l => l.type === 'LEFT_EYE').position.x,
//                 y: face.landmarks.find(l => l.type === 'LEFT_EYE').position.y
//             },
//             rightEye: {
//                 x: face.landmarks.find(l => l.type === 'RIGHT_EYE').position.x,
//                 y: face.landmarks.find(l => l.type === 'RIGHT_EYE').position.y
//             },
//             noseTip: {
//                 x: face.landmarks.find(l => l.type === 'NOSE_TIP').position.x,
//                 y: face.landmarks.find(l => l.type === 'NOSE_TIP').position.y
//             },
//             mouthCenter: {
//                 x: face.landmarks.find(l => l.type === 'MOUTH_CENTER').position.x,
//                 y: face.landmarks.find(l => l.type === 'MOUTH_CENTER').position.y
//             }
//         };
//         console.log(landmarks);
        
//         return {
//             landmarks,
//             confidence: face.detectionConfidence,
//             angerLikelihood: face.angerLikelihood,
//             joyLikelihood: face.joyLikelihood,
//             surpriseLikelihood: face.surpriseLikelihood,
//             rollAngle: face.rollAngle,
//             panAngle: face.panAngle,
//             tiltAngle: face.tiltAngle
//         };
//     } catch (error) {
//         console.error('Error in face detection:', error);
//         throw error;
//     }
// }

// async function getFaceFeaturesFromUrl(imageUrl) {
//     try {
//         // Download the image from URL
//         const response = await axios.get(imageUrl, {
//             responseType: 'arraybuffer'
//         });
        
//         // Convert to buffer and process
//         const imageBuffer = Buffer.from(response.data, 'base64');
//         return getFaceFeaturesFromBuffer(imageBuffer);
//     } catch (error) {
//         console.error('Error fetching or processing URL image:', error);
//         throw error;
//     }
// }

// // Your calculateSimilarity function remains the same

// function calculateSimilarity(features1, features2) {
//     if (!features1 || !features2) {
//         return 0.0;
//     }

//     // Calculate distance between corresponding landmarks
//     let landmarkDistance = 0;
//     for (const landmark in features1.landmarks) {
//         const point1 = features1.landmarks[landmark];
//         const point2 = features2.landmarks[landmark];
//         const distance = Math.sqrt(
//             Math.pow(point2.x - point1.x, 2) + 
//             Math.pow(point2.y - point1.y, 2)
//         );
//         landmarkDistance += distance;
//     }

//     // Normalize landmark distance
//     const landmarkScore = 1 / (1 + landmarkDistance/100);

//     // Compare angles
//     const angleDiff = 
//         Math.abs(features1.rollAngle - features2.rollAngle) +
//         Math.abs(features1.panAngle - features2.panAngle) +
//         Math.abs(features1.tiltAngle - features2.tiltAngle);
//     const angleScore = 1 / (1 + angleDiff/90);

//     // Calculate final similarity score
//     const confidenceScore = (features1.confidence + features2.confidence) / 2;
//     const similarityScore = (landmarkScore * 0.4 + angleScore * 0.3 + confidenceScore * 0.3);

//     return similarityScore;
// }

// export { getFaceFeaturesFromBuffer, getFaceFeaturesFromUrl, calculateSimilarity };


// Helper functions for face recognition and similarity calculation
async function getFaceFeaturesFromBuffer(imageBuffer) {
    try {
        const request = {
            image: {
                content: imageBuffer.toString('base64')
            },
            features: [
                { type: 'FACE_DETECTION', maxResults: 1 }
            ]
        };
        
        const [result] = await client.annotateImage(request);
        const faces = result.faceAnnotations;

        if (!faces || faces.length === 0) {
            return null;
        }

        const face = faces[0];
        const landmarks = {
            leftEye: {
                x: face.landmarks.find(l => l.type === 'LEFT_EYE').position.x,
                y: face.landmarks.find(l => l.type === 'LEFT_EYE').position.y
            },
            rightEye: {
                x: face.landmarks.find(l => l.type === 'RIGHT_EYE').position.x,
                y: face.landmarks.find(l => l.type === 'RIGHT_EYE').position.y
            },
            noseTip: {
                x: face.landmarks.find(l => l.type === 'NOSE_TIP').position.x,
                y: face.landmarks.find(l => l.type === 'NOSE_TIP').position.y
            },
            mouthCenter: {
                x: face.landmarks.find(l => l.type === 'MOUTH_CENTER').position.x,
                y: face.landmarks.find(l => l.type === 'MOUTH_CENTER').position.y
            }
        };
        
        return {
            landmarks,
            confidence: face.detectionConfidence,
            angerLikelihood: face.angerLikelihood,
            joyLikelihood: face.joyLikelihood,
            surpriseLikelihood: face.surpriseLikelihood,
            rollAngle: face.rollAngle,
            panAngle: face.panAngle,
            tiltAngle: face.tiltAngle
        };
    } catch (error) {
        console.error('Error in face detection:', error);
        throw error;
    }
}

async function getFaceFeaturesFromUrl(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'base64');
        return getFaceFeaturesFromBuffer(imageBuffer);
    } catch (error) {
        console.error('Error fetching or processing URL image:', error);
        throw error;
    }
}

function calculateSimilarity(features1, features2) {
    if (!features1 || !features2) {
        return 0.0;
    }

    let landmarkDistance = 0;
    for (const landmark in features1.landmarks) {
        const point1 = features1.landmarks[landmark];
        const point2 = features2.landmarks[landmark];
        const distance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
        landmarkDistance += distance;
    }

    const landmarkScore = 1 / (1 + landmarkDistance / 100);
    const angleDiff = 
        Math.abs(features1.rollAngle - features2.rollAngle) +
        Math.abs(features1.panAngle - features2.panAngle) +
        Math.abs(features1.tiltAngle - features2.tiltAngle);
    const angleScore = 1 / (1 + angleDiff / 90);
    const confidenceScore = (features1.confidence + features2.confidence) / 2;
    return (landmarkScore * 0.4 + angleScore * 0.3 + confidenceScore * 0.3);
}


export {
    getFaceFeaturesFromBuffer,
    getFaceFeaturesFromUrl,
    calculateSimilarity
}