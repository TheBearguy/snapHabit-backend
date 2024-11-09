// const path = require('path');
// const express = require('express');
// const compression = require('compression');
// const bodyParser = require('body-parser');
// const logger = require('morgan');
// const errorHandler = require('errorhandler');
// const dotenv = require('dotenv');
// const MongoStore = require('connect-mongo');
// const multer = require('multer');
// const rateLimit = require('express-rate-limit');
// const mongoose = require('mongoose');

import path from 'path';
import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import logger from 'morgan';
import errorHandler from 'errorhandler';
import dotenv from 'dotenv';
import MongoStore from 'connect-mongo';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import flash from 'express-flash';
import lusca from 'lusca';
import {upload} from './middlewares/multer.middleware.js';
import cors from 'cors';

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env.example' });

/**
 * Set config values
 */
// const secureTransfer = (process.env.BASE_URL.startsWith('https'));

// Consider adding a proxy such as cloudflare for production.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// This logic for numberOfProxies works for local testing, ngrok use, single host deployments
// behind cloudflare, etc. You may need to change it for more complex network settings.
// See readme.md for more info.
// let numberOfProxies;
// if (secureTransfer) numberOfProxies = 1; else numberOfProxies = 0;

/**
 * Controllers (route handlers).
 */
// const userController = require('./controllers/user');
// const apiController = require('./controllers/api');
// const homeController = require('./controllers/home');
// const contactController = require('./controllers/contact');

// //! follow, like, post, comment controllers
// const likeController = require('./controllers/like');
// const postController = require('./controllers/post');
// const commentController = require('./controllers/comment');
// const genAIController = require('./controllers/genai');

import {
  postLogin, 
  logout, 
  postSignup, 
  getAccount, 
  postUpdateProfile, 
  postUpdatePassword, 
  postDeleteAccount, 
  getOauthUnlink, 
  getReset, 
  getVerifyEmailToken,
  getVerifyEmail, 
  postReset, 
  getForgot, 
  postForgot
} from './controllers/user.js';

import {
  getFacebook, 
  getGithub, 
  getStripe, 
  postStripe, 
  getPayPal, 
  getPayPalSuccess, 
  getPayPalCancel, 
  getLob, 
  getPinterest, 
  postPinterest, 
  getHereMaps, 
  getGoogleMaps, 
  getGoogleDrive, 
  getGoogleSheets
}from './controllers/api.js';

import {
  postContact,
  getContact
} from './controllers/contact.js';


import {
    allPosts,
    publishAPost,
    getPostById,
    updatePost,
    deletePost,
    toggleIsPublished
} from './controllers/post.js';

import {
  toggleVideoLike,
    toggleCommentLike,
    toggleCommunityPostLike,
    getAllLikedPosts
    // getAllLikedVideos
} from './controllers/like.js';

import {
  getPostComments,
    addComment,
    deleteComment,
    updateComment
} from './controllers/comment.js';


import {
  getAllCourses,
  getAllCoursesNoPagination,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
} from './controllers/course.controller.js';

import {
  toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels
} from './controllers/follow.js';

// import {
//   genAIController,
// } from '../controllers/genai.js';

import {
  getInference,
    getRAGResponse,
    generateVideoQuiz,
    generateVideoSummary,
    generateAnswer,
    haveChat,
    haveChatWithRAG,
} from './controllers/genai.controller.js';

/**
 * API keys and Passport configuration.
 */
// const passportConfig = require('./config/passport');
import {
  isAuthenticated, 
  isAuthorized
} from './config/passport.js';

/**
 * Create Express server.
 */
const app = express();
console.log('Running the backend API server.\n');

const corsOptions = {
  origin: 'http://localhost:3000/', // Allow only your frontend's domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  credentials: true, // Allow cookies to be sent with the requests
};

app.use(cors(corsOptions));
/**
 * Connect to MongoDB.
 */
// mongoose.connect(process.env.MONGODB_URI);
// mongoose.connection.on('error', (err) => {
//   console.error(err);
//   console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
//   process.exit();
// });

/**
 * Express configuration.
 */
app.set('host', '0.0.0.0');  // Ensure the app listens on all interfaces.
app.set('port', 3000);  // Directly set the port to 3000

// Middleware setup
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(limiter);  // Apply rate limiting

// Session configuration
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,  // Ensure you have this in your .env file
  name: 'startercookie', // Change the cookie name for added security in production
  cookie: {
    maxAge: 1209600000, // Two weeks in milliseconds
    // secure: secureTransfer // Set to true if you're using https, false for http
  },
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })  // Use MongoDB to store session data
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// app.use((req, res, next) => {
//   if (req.path === '/api/upload') {
//     // Multer multipart/form-data handling needs to occur before the Lusca CSRF check.
//     next();
//   } else {
//     lusca.csrf()(req, res, next);
//   }
// });
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
// API Routes
// app.use('/api/users', userController);  // Add your user-related routes
// app.use('/api', apiController);  // Add general API routes

// Error handling middleware (only for development)
if (process.env.NODE_ENV === 'development') {
  app.use(errorHandler());
}

// Global error handler (if needed)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

/**
 * Start the server.
 */
// app.listen(app.get('port'), () => {
//   console.log(`API server listening on port ${app.get('port')}`);
// });

/**
 * Primary app routes.
 */
// app.get('/', homeController.index);
// app.get('/login', getLogin);
app.post('/login', postLogin);
app.get('/logout', logout);
app.get('/forgot', getForgot);
app.post('/forgot', postForgot);
app.get('/reset/:token', getReset);
app.post('/reset/:token', postReset);
// app.get('/signup', getSignup); 
app.post('/signup', postSignup);
app.get('/contact', getContact);
app.post('/contact', postContact);
app.get('/account/verify', isAuthenticated, getVerifyEmail);
app.get('/account/verify/:token', isAuthenticated, getVerifyEmailToken);
app.get('/account', isAuthenticated, getAccount);
app.post('/account/profile', isAuthenticated, postUpdateProfile);
app.post('/account/password', isAuthenticated, postUpdatePassword);
app.post('/account/delete', isAuthenticated, postDeleteAccount);
app.get('/account/unlink/:provider', isAuthenticated, getOauthUnlink);


/**
 * API examples routes.
 */
// app.get('/api', getApi);
app.get('/api/stripe', getStripe);
app.post('/api/stripe', postStripe);
app.get('/api/github', isAuthenticated, isAuthorized, getGithub);
app.get('/api/paypal', getPayPal);
app.get('/api/paypal/success', getPayPalSuccess);
app.get('/api/paypal/cancel', getPayPalCancel);
app.get('/api/lob', getLob);
// app.get('/api/upload', lusca({ csrf: true }), getFileUpload);
// app.post('/api/upload', upload.single('myFile'), lusca({ csrf: true }), postFileUpload);
app.get('/api/here-maps', getHereMaps);
app.get('/api/google-maps', getGoogleMaps);
app.get('/api/google/drive', isAuthenticated, isAuthorized, getGoogleDrive);
app.get('/api/google/sheets', isAuthenticated, isAuthorized, getGoogleSheets);


/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'], accessType: 'offline', prompt: 'consent' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});

//TODO: Post Routes
console.log(allPosts);

app.get('/post/allPosts', allPosts);
app.post("/post/create", 
  upload.fields([
    {
      name: "content",
      maxCount: 1
    }
  ]),
  publishAPost);

app.get("/post/:id", getPostById);

app.patch("/post/update/:id", updatePost);

app.delete("/post/delete/:id", deletePost);


//TODO: Follow Routes
app.post("/toggle-follow/:userId", toggleSubscription);
app.get("/followers/:userId", getChannelSubscribers);
app.get("/following/:userId", getSubscribedChannels);


//TODO: Like Routes
app.post("/toggle-like/:postId", toggleVideoLike);
app.post("/toggle-comment-like/:commentId", toggleCommentLike);
app.get("/get-liked-posts", getAllLikedPosts);


//TODO: Comment Routes
app.post("/create-comment/:postId", addComment);
app.get("/post/:postId/comments", getPostComments);
app.delete("/delete-comment/:postId/:commentId", deleteComment);
app.patch("/update-comment/:postId/:commentId", updateComment);


//TODO: Course Routes
app.get("/course/allCourses", getAllCourses);
app.get("/course/:id", getCourse);
app.post("/course/create", createCourse);
app.patch("/course/update/:courseId", updateCourse);
app.delete("/course/delete/:courseId", deleteCourse);


//TODO: GenAI Routes
app.post("/generate/quiz/:id", generateVideoQuiz);
app.post("/generate/summary/:id", generateVideoSummary);
app.post("/generate/answer", generateAnswer); 
app.post("/chat", haveChat); 
app.post("chat/rag", haveChatWithRAG); 

/**
 * Error Handler.
 */
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  res.status(404).send('Page Not Found');
});

if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
//  */
// app.listen(app.get('port'), () => {
//   const { BASE_URL } = process.env;
//   const colonIndex = BASE_URL.lastIndexOf(':');
//   const port = parseInt(BASE_URL.slice(colonIndex + 1), 10);

//   if (!BASE_URL.startsWith('http://localhost')) {
//     console.log(`The BASE_URL env variable is set to ${BASE_URL}. If you directly test the application through http://localhost:${app.get('port')} instead of the BASE_URL, it may cause a CSRF mismatch or an Oauth authentication failur. To avoid the issues, change the BASE_URL or configure your proxy to match it.\n`);
//   } else if (app.get('port') !== port) {
//     console.warn(`WARNING: The BASE_URL environment variable and the App have a port mismatch. If you plan to view the app in your browser using the localhost address, you may need to adjust one of the ports to make them match. BASE_URL: ${BASE_URL}\n`);
//   }

//   console.log(`App is running on http://localhost:${app.get('port')} in ${app.get('env')} mode.`);
//   console.log('Press CTRL-C to stop.');
// });

export default app;