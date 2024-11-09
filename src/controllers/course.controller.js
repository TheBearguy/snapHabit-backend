//! If this functionality is to be used, some changes are to be made in how the course is managed by the db.


import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

dotenv.config();

export const getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);

        const courses = await Course.find()
            .select('-__v')
            .limit(limitInt)
            .skip((pageInt - 1) * limitInt);

        const count = await Course.countDocuments();
        res.status(200).json({
            courses,
            totalPages: Math.ceil(count / limitInt),
            currentPage: pageInt
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

export const getAllCoursesNoPagination = async (req, res) => {
    try {
        const courses = await Course.find().select('-__v'); 
        res.status(200).json(courses);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

export const getCourse = async (req, res) => {    
    try {
        const course = await Course.findById(req.params.id).select('-__v');
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json(course);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

export const createCourse = async (req, res) => {
    try {
        const { name, description, coverimage, videolink } = req.body;
        if (!name || !description || !videolink) {
            return res.status(400).json({ message: "Name, description, and videolink are required" });
        }
        const newCourse = new Course({ name, description, coverimage, videolink });
        const savedCourse = await newCourse.save();
        res.status(201).json({ message: "Course created successfully", course: savedCourse });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

export const updateCourse = async (req, res) => {
    try {
        const updates = req.body;
        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );
        if (!updatedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ message: "Course updated successfully", course: updatedCourse });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};

export const deleteCourse = async (req, res) => {
    try {
        const deletedCourse = await Course.findByIdAndDelete(req.params.id);
        if (!deletedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
    }
};


