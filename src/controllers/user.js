import { promisify } from 'util';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import passport from 'passport';
import validator from 'validator';
import User from '../models/user.model.js'; // Note the.js extension if necessary
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import mailChecker from 'mailchecker';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const randomBytesAsync = promisify(crypto.randomBytes);

//TODO: Send the fucking mail
const sendMail = async (settings) => {
    const transportConfig = {
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };
  
    let transporter = nodemailer.createTransport(transportConfig);
  
    try {
      await transporter.sendMail(settings);
      return { success: true, message: settings.successfulMsg };
        // return res.status(200).json( new ApiResponse(200, settings.successfulMsg) );
    } catch (err) {
      if (err.message === 'self signed certificate in certificate chain') {
        console.log('WARNING: Self signed certificate in certificate chain. Retrying with TLS adjustments.');
        transportConfig.tls = transportConfig.tls || {};
        transportConfig.tls.rejectUnauthorized = false;
        transporter = nodemailer.createTransport(transportConfig);
        await transporter.sendMail(settings);
        // return res.status(200).json( new ApiResponse(200, settings.successfulMsg) );
        return {
          success: true,
          message: settings.successfulMsg
        }
      }
      console.error(settings.loggingError, err);
      // return res.status(500).json( new ApiResponse(500, settings.errorMsg) );
      return {
        success: false,
        message: settings.errorMsg
      }
    }
  };


//TODO: Sign in using emaill and password
const  postLogin = (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' });
  
    if (validationErrors.length) {
    //   return res.status(400).json({ errors: validationErrors });
      throw new ApiError(400, validationErrors);
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err); }
      if (!user) {
        // return res.status(401).json({ errors: [info] });
        throw new ApiError(401, info);
      }
      req.logIn(user, (err) => {
        if (err) { return next(err); }
        // res.status(200).json({ success: true, message: 'Success! You are logged in.', user });
        return res.status(200).json( new ApiResponse(200, 'Success! You are logged in.', user) );
      });
    })(req, res, next);
  };


//TODO:Log out and end the user session.

 const  logout = (req, res) => {
   req.logout((err) => {
     if (err) {
       console.log('Error: Failed to logout.', err);
    //    return res.status(500).json({ success: false, message: 'Failed to logout' });
       throw new ApiError(500, 'Failed to logout');
    }
     req.session.destroy((err) => {
       if (err) {
         console.log('Error: Failed to destroy the session during logout.', err);
        //  return res.status(500).json({ success: false, message: 'Failed to destroy the session during logout' });
         throw new ApiError(500, 'Failed to destroy the session during logout');
    }
       req.user = null;
    //    res.status(200).json({ success: true, message: 'Successfully logged out' });
       return res.status(200).json( new ApiResponse(200, 'Successfully logged out') );     
    });
   });
 };


 //TODO: Create a new local account
 const postSignup = async (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'Password must be at least 8 characters long' });
    if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match' });
  
    if (validationErrors.length) {
    //   return res.status(400).json({ errors: validationErrors });
      throw new ApiError(400, validationErrors);
    }
  
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  
    try {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        // return res.status(400).json({ errors: [{ msg: 'Account with that email address already exists.' }] });
        throw new ApiError(400, 'Account with that email address already exists.');
    }
  
      const user = new User({
        email: req.body.email,
        password: req.body.password,
      });
      await user.save();
  
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        // res.status(201).json({ success: true, message: 'Account created successfully', user });
        return res.status(201).json( new ApiResponse(201, 'Account created successfully', user) );
    });
    } catch (err) {
      next(err);
    }
  };


// TODO : Retrieve user profile information.

const  getAccount = (req, res) => {
   if (!req.user) {
    //  return res.status(401).json({ error: 'Unauthorized access' });
     throw new ApiError(401, 'Unauthorized access');
   }
//    res.status(200).json({
//      title: 'Account Management',
//      user: req.user,
//    });
   return res.status(200).json( new ApiResponse(200, 'Account Management', req.user) );
 };
 


//TODO: Update user profile information.
const  postUpdateProfile = async (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });

  if (validationErrors.length) {
    // return res.status(400).json({ errors: validationErrors });
    throw new ApiError(400, validationErrors);
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
    //   return res.status(404).json({ msg: 'User not found' });
      throw new ApiError(404, 'User not found');
    }

    if (user.email !== req.body.email) user.emailVerified = false;
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    await user.save();
    
    // res.status(200).json({ success: true, msg: 'Profile information has been updated.', user });
    return res.status(200).json( new ApiResponse(200, 'Profile information has been updated.', user) );
} catch (err) {
    if (err.code === 11000) {
    //   return res.status(400).json({ errors: [{ msg: 'The email address you have entered is already associated with an account.' }] });
      throw new ApiError(400, 'The email address you have entered is already associated with an account.');
    }
    next(err);
  }
};


//TODO: Update current password.
const  postUpdatePassword = async (req, res, next) => {
    const validationErrors = [];
    if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'Password must be at least 8 characters long.' });
    if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match.' });
  
    if (validationErrors.length) {
    //   return res.status(400).json({ errors: validationErrors });
      throw new ApiError(400, validationErrors);
    }
  
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        // return res.status(404).json({ msg: 'User not found' });
        throw new ApiError(404, 'User not found');
      }
      user.password = req.body.password;
      await user.save();
      
    //   res.status(200).json({ success: true, msg: 'Password has been changed.' });
      return res.status(200).json( new ApiResponse(200, 'Password has been changed.') );
    } catch (err) {
      next(err);
    }
  };


  //TODO: Delete user account
  const  postDeleteAccount = async (req, res, next) => {
    try {
      await User.deleteOne({ _id: req.user.id });
      
      req.logout((err) => {
        if (err) console.log('Error: Failed to logout.', err);
        
        req.session.destroy((err) => {
          if (err) {
            console.log('Error: Failed to destroy the session during account deletion.', err);
            // return res.status(500).json({ success: false, msg: 'Failed to delete account.' });
            throw new ApiError(500, 'Failed to delete account.');
          }
          
          req.user = null;
        //   res.status(200).json({ success: true, msg: 'Your account has been deleted.' });
          return res.status(200).json( new ApiResponse(200, 'Your account has been deleted.') );
        });
      });
    } catch (err) {
      next(err);
    }
  };
  


//TODO:  Unlink OAuth provider.
const  getOauthUnlink = async (req, res, next) => {
  try {
    let { provider } = req.params;
    provider = validator.escape(provider);
    const user = await User.findById(req.user.id);
    
    if (!user) {
    //   return res.status(404).json({ msg: 'User not found' });
      throw new ApiError(404, 'User not found');
    }
    
    user[provider.toLowerCase()] = undefined;
    const tokensWithoutProviderToUnlink = user.tokens.filter(
      (token) => token.kind !== provider.toLowerCase()
    );
       // Some auth providers do not provide an email address in the user profile.
    // As a result, we need to verify that unlinking the provider is safe by ensuring
    // that another login method exists.
    // Ensure another login method exists before unlinking
    if (!(user.email && user.password) && tokensWithoutProviderToUnlink.length === 0) {
    //   return res.status(400).json({
    //     errors: [{ 
    //       msg: `The ${_.startCase(provider)} account cannot be unlinked without another form of login enabled. Please link another account or add an email address and password.`
    //     }]
    //   });
      throw new ApiError(400, `The ${_.startCase(provider)} account cannot be unlinked without another form of login enabled. Please link another account or add an email address and password.`);
    }
    
    user.tokens = tokensWithoutProviderToUnlink;
    await user.save();
    
    // res.status(200).json({
    //   success: true,
    //   msg: `${_.startCase(provider)} account has been unlinked.`
    // });
    return res.status(200).json( new ApiResponse(200, `${_.startCase(provider)} account has been unlinked.`) );
  } catch (err) {
    next(err);
  }
};


//TODO: Reset Password page
const  getReset = async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
    //   return res.status(403).json({ msg: 'You are already authenticated.' });
      throw new ApiError(403, 'You are already authenticated.');
    }
    
    const validationErrors = [];
    if (!validator.isHexadecimal(req.params.token)) {
      validationErrors.push({ msg: 'Invalid token. Please retry.' });
    }
    
    if (validationErrors.length) {
    //   return res.status(400).json({ errors: validationErrors });
      throw new ApiError(400, validationErrors);
    }

    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() }
    }).exec();
    
    if (!user) {
    //   return res.status(400).json({
    //     errors: [{ msg: 'Password reset token is invalid or has expired.' }]
    //   });
      throw new ApiError(400, 'Password reset token is invalid or has expired.');
    }
    
    // res.status(200).json({
    //   success: true,
    //   msg: 'Password reset token is valid.',
    //   userId: user.id  // or any other data you may want to return
    // });
    return res.status(200).json( new ApiResponse(200, 'Password reset token is valid.', { userId: user.id }) );
  } catch (err) {
    next(err);
  }
};

//TODO: Verify email address
const  getVerifyEmailToken = async (req, res, next) => {
    if (req.user.emailVerified) {
    //   return res.status(200).json({ msg: 'The email address has already been verified.' });
      throw new ApiError(200, 'The email address has already been verified.');
    }
  
    const validationErrors = [];
    if (validator.escape(req.params.token) && !validator.isHexadecimal(req.params.token)) {
      validationErrors.push({ msg: 'Invalid token. Please retry.' });
    }
    if (validationErrors.length) {
    //   return res.status(400).json({ errors: validationErrors });
      throw new ApiError(400, validationErrors);
    }
  
    if (req.params.token === req.user.emailVerificationToken) {
      try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
        //   return res.status(404).json({ msg: 'User profile not found.' });
          throw new ApiError(404, 'User profile not found.');
        }
        user.emailVerificationToken = '';
        user.emailVerified = true;
        await user.save();
        // return res.status(200).json({ msg: 'Thank you for verifying your email address.' });
        return res.status(200).json( new ApiResponse(200, 'Thank you for verifying your email address.') );
      } catch (error) {
        console.error('Error updating user profile after email verification:', error);
        // return res.status(500).json({ msg: 'There was an error updating your profile. Please try again later.' });
        throw new ApiError(500, 'There was an error updating your profile. Please try again later.');
      }
    } else {
    //   return res.status(400).json({ msg: 'The verification link is invalid or for a different account.' });
      throw new ApiError(400, 'The verification link is invalid or for a different account.');
    }
  };


//TODO: Send verification email
const  getVerifyEmail = async (req, res, next) => {
  if (req.user.emailVerified) {
    // return res.status(200).json({ msg: 'The email address has already been verified.' });
    throw new ApiError(200, 'The email address has already been verified.');
  }

  if (!mailChecker.isValid(req.user.email)) {
    // return res.status(400).json({
    //   msg: 'The email address is invalid or disposable and cannot be verified. Please update your email address and try again.'
    // });
    throw new ApiError(400, 'The email address is invalid or disposable and cannot be verified. Please update your email address and try again.');
  }

  try {
    const token = (await randomBytesAsync(16)).toString('hex');
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
    //   return res.status(404).json({ msg: 'User profile not found.' });
      throw new ApiError(404, 'User profile not found.');
    }
    
    user.emailVerificationToken = token;
    await user.save();

    const mailOptions = {
      to: req.user.email,
      from: process.env.SITE_CONTACT_EMAIL,
      subject: 'Please verify your email address on Hackathon Starter',
      text: `Thank you for registering.\n\nTo verify your email address, click the link below or paste it into your browser:\n\n
        http://${req.headers.host}/account/verify/${token}\n\nThank you!`
    };

    await sendMail(mailOptions);
    // res.status(200).json({ msg: `An email has been sent to ${req.user.email} with further instructions.` });
    return res.status(200).json( new ApiResponse(200, `An email has been sent to ${req.user.email} with further instructions.`) );
  } catch (error) {
    console.error('Error sending verification email:', error);
    // return res.status(500).json({ msg: 'Error sending the email verification message. Please try again shortly.' });
    throw new ApiError(500, 'Error sending the email verification message. Please try again shortly.');
  }
};


//TODO: Process the reset password request.
const  postReset = async (req, res, next) => {
  const validationErrors = [];
  if (!validator.isLength(req.body.password, { min: 8 })) {
    validationErrors.push({ msg: 'Password must be at least 8 characters long.' });
  }
  if (validator.escape(req.body.password) !== validator.escape(req.body.confirm)) {
    validationErrors.push({ msg: 'Passwords do not match.' });
  }
  if (!validator.isHexadecimal(req.params.token)) {
    validationErrors.push({ msg: 'Invalid token. Please retry.' });
  }

  if (validationErrors.length) {
    // return res.status(400).json({ errors: validationErrors });
    throw new ApiError(400, validationErrors);
  }

  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
    //   return res.status(400).json({ msg: 'Password reset token is invalid or has expired.' });
      throw new ApiError(400, 'Password reset token is invalid or has expired.');
    }

    user.password = req.body.password;  
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    req.logIn(user, (err) => {
      if (err) return next(err);
    });

    // Send reset confirmation email
    const mailOptions = {
      to: user.email,
      from: process.env.SITE_CONTACT_EMAIL,
      subject: 'Your password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
    };

    await sendMail(mailOptions);

    // res.status(200).json({ msg: 'Success! Your password has been changed.' });
    return res.status(200).json( new ApiResponse(200, 'Success! Your password has been changed.') );
  } catch (err) {
    console.error('Error processing password reset:', err);
    next(err);
  }
};

//TODO: Forgot Password page placeholder
const  getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).json({ msg: 'You are already authenticated.' });
  }
  res.status(200).json({ msg: 'Forgot Password endpoint' });
};


//TODO: Create a random token, then send the user an email with a reset link.

const  postForgot = async (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) {
      validationErrors.push({ msg: 'Please enter a valid email address.' });
    }
  
    if (validationErrors.length) {
      return res.status(400).json({ errors: validationErrors });
    }
  
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  
    try {
      const token = (await randomBytesAsync(16)).toString('hex');
  
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(400).json({ msg: 'Account with that email address does not exist.' });
      }
  
      user.passwordResetToken = token;
      user.passwordResetExpires = Date.now() + 3600000; // 1 hour
      await user.save();
  
      // Send forgot password email
      const mailOptions = {
        to: user.email,
        from: process.env.SITE_CONTACT_EMAIL,
        subject: 'Reset your password on Hackathon Starter',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
  
      await sendMail(mailOptions);
      res.status(200).json({ msg: `An email has been sent to ${user.email} with further instructions.` });
    } catch (err) {
      console.error('Error processing forgot password:', err);
      next(err);
    }
  };
  

  export const postUser = async (req, res, next) => {
    try {
      const { name, email } = req.body;
      console.log(req.body);
      
  
      if (!name) {
        throw new ApiError(400, "No name found");
      }
  
      if (!email) {
        throw new ApiError(400, "No email found");
      }
  
      const contentFilePath = req.files?.image[0]?.path;
  
      const uploadedContent = await uploadOnCloudinary(contentFilePath, {
        resource_type: "image",
      });
  
      if (!uploadedContent) {
        throw new ApiError(401, "Content couldn't be uploaded to Cloudinary");
      }
  
      const user = new User({
        name,
        image: uploadedContent.url,
        email,
      });
  
      await user.save();
      return res
        .status(200)
        .json(new ApiResponse(200, user, "User Added Successfully"));
    } catch (err) {
      next(err);
    }
  };


  export {
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
  }