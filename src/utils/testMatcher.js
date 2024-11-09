// test-matcher.js
import { ImageTextMatcher } from './ImageTextMatcher.js';  
async function testImageTextMatch() {
    try {
        // Initialize the matcher with your Google Cloud credentials file path
        const credentialsPath = '../google-cloud-visionAI-key.json';  // Replace with your actual credentials path
        const matcher = new ImageTextMatcher(credentialsPath);

        // Path to your test image
        // const imagePath = '../upload/test-image.jpg';  // Replace with your image path
        
        const imagePath = '../public/temp/gilfoyle.jpg'

        // Your text description
        const {postId} = req.body;

        const post = await axios(`http://localhost:3000/post/${postId}`);
        
        // const textDescription = post.caption;

        const textDescription = 'A man with computer monitor in the background';

        // Optional matching options
        const options = {
            minConfidence: 0.7,
            minMatches: 1,
            requireExactMatch: false
        };

        // Perform the match
        const result = await matcher.matchImageAndText(imagePath, textDescription, options);

        // Log the results
        console.log('Match Result:', JSON.stringify(result, null, 2));
        
        if (result.isMatch) {
            console.log('\nMatch found! ✅');
            console.log('Confidence:', (result.confidence * 100).toFixed(2) + '%');
            console.log('\nMatched Labels:', result.details.labels);
            console.log('Matched Objects:', result.details.objects);
        } else {
            console.log('\nNo match found ❌');
            console.log('Suggestions:', result.suggestions);
        }

    } catch (error) {
        console.error('Error testing image matcher:', error);
    }
}

// Run the test
testImageTextMatch();