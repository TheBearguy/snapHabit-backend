import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Course name is mandatory"]
    },
    description: {
        type: String,
        required: [true, "Course description is mandatory"]
    },
    coverimage: {
        type: String,
        default: "https://elearningindustry.com/wp-content/uploads/2020/12/how-to-improve-your-elearning-course-cover-design.png",
        required: [true, "Course image is mandatory"]
    },
    videolink: {
        type: String,
        required: [true, "Course link is mandatory"]
    }
});

const Course = mongoose.model("Course", courseSchema);
export default Course;