import passport from "passport";
import {Strategy as  LocalStrategy} from "passport-local"; 
import {Strategy as GithubStrategy} from "passport-github2"; 
import { OAuth2Strategy as GoogleStrategy } from "passport-google-oauth";
import { OAuth2Strategy } from "passport-oauth";
import { OAuthStrategy } from "passport-oauth";
// import {refresh} from "passport-oauth2-refresh";
import pkg from 'passport-oauth2-refresh';
const { refresh } = pkg;

// Now you can use `refresh` in your code

import { Axios } from "axios";
import {ApiError} from "../utils/ApiError.js"


import User from "../models/user.model.js";
import { urlencoded } from "express";

passport.serializeUser( (user, done) => {
    done(null, user.id); 
}); 

passport.deserializeUser( async (id, done) => {
    try {
        return done(null, await User.findById(id));
    } catch (error) {
        done(error); 
        throw new  ApiError(500, error.message);
    }
});  

// * Sign In using Email and Password

const localStrategyConfig = new LocalStrategy(
    {
        usernameField: 'email'
    }, 
    (email, password, done) => {
        User.findOne({
            email: email.toLowerCase()
        })
        .then((user) => {
            if(!user) {
                return done(null, false, {
                    message: `No user found with email ${email}`
                }); 
            }
            if(!user.password) {
                return done(null, false, {
                    message: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.'
                });
            }
            user.comparePassword(password, (err, isMatch) => {
                if ( err ) return done(err);
                if (isMatch) {
                    return done(null, user);  
                } 
                return done(null, false, {
                    message: "Invalid email or password"
                }); 
            }); 
        })
        .catch((error) =>  {
            done(error);
        }); 
    }
); 

passport.use('local', localStrategyConfig); 

  /**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

// * Sign in with Github
const githubStrategyConfig = new GithubStrategy(
    {
        clientID: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/github/callback`, //! this is Temporary, add the url where you want to redirect after login.
        passReqToCallback: true, 
        scope: ['user:email'],
    }, 
    async(req, accessToken, refreshToken, profile, done) => {
        try {
            if (req.user) {
                const  existingUser = await User.findOne({
                    github: profile.id
                });
                if(existingUser)   {
                    req.flash('errors', {
                        msg: 'There is already a Github account that belongs to you. Sign in with that account or delete it, then link it with your current account.'
                    });
                    return done(null, existingUser);
                }
                const  user = await  User.findById(req.user.id); 
                user.github = profile.id;
                user.tokens.push({
                    kind: 'github',
                    accessToken
                });
                user.profile.name = user.profile.name ||  profile.displayName;
                user.profile.picture = user.profile.picture || profile._json.avatar_url;
                user.profile.location = user.profile.location ||  profile._json.location;
                user.profile.website = user.profile.website ||  profile._json.blog;
                await user.save();
                req.flash('info', {
                    msg: "Github account has been linked."
                }); 
                return done(null, user);
            }
            const existingUser = await User.findOne({
                github: profile.id
            });
            if(existingUser)   {
                return done(null, existingUser);
            }

            const emailValue  = _.get(_.orderBy(
                profile.emails, 
                ['primary', 'verified'], 
                ['desc', 'desc']
            ), [0, 'value']);
            if (profile._json.email === null) {
                const existingEmailUser = await User.findOne({
                    email: emailValue
                });
                if(existingEmailUser) {
                    req.flash("errors", {
                        msg: 'There is already an account using this email address. Sign in to that account and link it with Github manually from your user settings page.'
                    });
                    return done(null, existingEmailUser); 
                }
            } else{
                const existingEmailUser = await User.findOne({
                    email: profile._json.email
                });
                if (existingEmailUser) {
                    req.flash("errors",  {
                        msg: 'There is already an account using this email address. Sign in to that account and link it with Github manually from your user settings page.'
                    })
                    return done(null, existingEmailUser);
                }
            }
            const user = new User(); 
            user.email = emailValue; 
            user.github = profile.id; 
            user.tokens.push({
                kind: "github", 
                accessToken
            }); 
            user.profile.name = profile.displayName;
            user.profile.picture = profile._json.avatar_url;
            user.profile.location = profile._json.location;
            user.profile.website = profile._json.blog;
            await user.save();
            return done(null,user); 
        } catch (error) {
            return done(error);
        }
    }
); 

passport.use('github', githubStrategyConfig);

// * Sign in as Google

const googleStrategyConfig = new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, params, profile, done) => {
    try {
      if (req.user) {
        const existingUser = await User.findOne({ google: profile.id });
        if (existingUser && (existingUser.id !== req.user.id)) {
          req.flash('errors', { msg: 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
          return done(null, existingUser);
        }
        const user = await User.findById(req.user.id);
        user.google = profile.id;
        user.tokens.push({
          kind: 'google',
          accessToken,
          accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
          refreshToken,
        });
        user.profile.name = user.profile.name || profile.displayName;
        user.profile.gender = user.profile.gender || profile._json.gender;
        user.profile.picture = user.profile.picture || profile._json.picture;
        await user.save();
        req.flash('info', { msg: 'Google account has been linked.' });
        return done(null, user);
      }
      const existingUser = await User.findOne({ google: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const existingEmailUser = await User.findOne({ email: profile.emails[0].value });
      if (existingEmailUser) {
        req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
        return done(null, existingEmailUser);
      }
      const user = new User();
      user.email = profile.emails[0].value;
      user.google = profile.id;
      user.tokens.push({
        kind: 'google',
        accessToken,
        accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
        refreshToken,
      });
      user.profile.name = profile.displayName;
      user.profile.gender = profile._json.gender;
      user.profile.picture = profile._json.picture;
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });

  passport.use('google', googleStrategyConfig);
//   refresh.use('google', googleStrategyConfig);
//! Activaate this as   soon as frontend is ready and google OAuth is done, or else u r fucked.
  //! what the hell does this "refresh" thing do ? 

//   * Login Required middleware.

  export const isAuthenticated =  (req, res, next) => {
    if (req.isAuthenticated()) {
        return next(); 
    }
    // res.redirect('/login');
    throw new ApiError(401, 'You must be logged in to view this page.');
  };

//   * Authorization Required middleware.

export const isAuthorized = async (req,res, next) => {
    const provider = req.path.split('/')[2];
    const token = req.user.tokens.find((token) => token.kind === provider);
    if (token) {
        if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
            if (token.refreshToken) {
                if(token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
                    return res.redirect(`/auth/${provider}`);
                }    
                try {
                    const newTokens = await  new Promise((resolve, reject) =>{
                        refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, results) => {
                            if (err) {
                                reject(err); 
                            }
                            resolve({accessToken, refreshToken, params});
                        });
                    });

                    req.user.tokens.forEach((tokenObject) => {
                        if (tokenObject.kind === provider) {
                            tokenObject.accessToken = newTokens.accessToken; 
                            if(newTokens.params.expires_in){
                                tokenObject.accessTokenExpires = moment().add(newTokens.params.expires_in, 'seconds').format();
                            }   
                        }
                    });
                    await req.user.save(); 
                    return next(); 
                } catch (error) {
                    console.log(error);
                    return next();
                }
            } else {
                return res.redirect(`/auth/${provider}`);
            }
        } else {
            return next(); 
        }
    } else {
        return res.redirect(`/auth/${provider}`);
    }
}
