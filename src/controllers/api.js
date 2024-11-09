import crypto from 'crypto';
import {Octokit} from '@octokit/rest';
import stripe from 'stripe';
import paypal from 'paypal-rest-sdk';
import axios from 'axios';
import googledrive from '@googleapis/drive';
import googlesheets from '@googleapis/sheets';
import validator from 'validator';
import { Configuration, LetterEditable, LettersApi, ZipEditable, ZipLookupsApi } from '@lob/lob-typescript-sdk';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

//TODO: Fetch Facebook profile data.
export const  getFacebook = (req, res, next) => {
 const token = req.user.tokens.find((token) => token.kind === 'facebook');
 const secret = process.env.FACEBOOK_SECRET;
 const appsecretProof = crypto.createHmac('sha256', secret).update(token.accessToken).digest('hex');

 axios.get(`https://graph.facebook.com/${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone&access_token=${token.accessToken}&appsecret_proof=${appsecretProof}`)
   .then((response) => {
    //  res.status(200).json({
    //    title: 'Facebook API',
    //    profile: response.data
    //  });
    res.status(200).json( new ApiResponse(200, {
        title: 'Facebook API', 
        profile: response.data
        }) 
    );
   })
   .catch((error) => {
     console.error(error);
    //  res.status(500).json({
    //    error: 'Failed to fetch Facebook profile',
    //    message: error.response ? error.response.data : error.message
    //  });
    throw new ApiError(500, 'Failed to fetch Facebook profile', error.response ? error.response.data : error.message);
   });
};


//TODO: Github API

export const  getGithub = async (req, res, next) => {
    const github = new Octokit();
    try {
      const { data: repo } = await github.repos.get({ owner: 'TheBearguy', repo: 'backend-template' });
    //   res.status(200).json({
    //     title: 'GitHub API',
    //     repo
    //   });
      res.status(200).json( new ApiResponse(200, {
        title: 'GitHub API', 
        repo
        }) 
    );
    } catch (error) {
      console.error(error);
    //   res.status(500).json({
    //     error: 'Failed to fetch GitHub repository data',
    //     message: error.message
    //   });
      throw new ApiError(500, 'Failed to fetch GitHub repository data', error.message);
    }
  };


//TODO: Stripe API
export const  getStripe = (req, res) => {
    // res.status(200).json({
    //   title: 'Stripe API',
    //   publishableKey: process.env.STRIPE_PKEY
    // });
    res.status(200).json( new ApiResponse(200, {
        title: 'Stripe API', 
        publishableKey: process.env.STRIPE_PKEY
        }) 
    );
  };


//TODO: Stripe Charge API

export const  postStripe = (req, res) => {
    const { stripeToken, stripeEmail } = req.body;
  
    stripe.charges.create({
      amount: 395,
      currency: 'usd',
      source: stripeToken,
      description: stripeEmail
    }, (err) => {
      if (err && err.type === 'StripeCardError') {
        // return res.status(400).json({
        //   error: 'Your card has been declined.'
        // });
        throw new ApiError(400, 'Your card has been declined.');
      }
    //   return res.status(200).json({
    //     success: 'Your card has been successfully charged.'
    //   });
      throw new ApiError(200, 'Your card has been successfully charged.');
    });
  };


//TODO: PayPal SDK
//* GET /api/paypal
export const  getPayPal = (req, res, next) => {
    paypal.configure({
      mode: 'sandbox', // or 'live'
      client_id: process.env.PAYPAL_ID,
      client_secret: process.env.PAYPAL_SECRET
    });
  
    const paymentDetails = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.BASE_URL}/api/paypal/success`,
        cancel_url: `${process.env.BASE_URL}/api/paypal/cancel`
      },
      transactions: [{
        description: 'Hackathon Starter',
        amount: {
          currency: 'USD',
          total: '1.99'
        }
      }]
    };
    paypal.payment.create(paymentDetails, (err, payment) => {
        if (err) { 
          return next(err); 
        }
        
        const { links, id } = payment;
        req.session.paymentId = id;
    
        const approvalUrl = links.find(link => link.rel === 'approval_url')?.href;
        if (approvalUrl) {
        //   return res.status(200).json({
        //     approvalUrl
        //   });
          return res.status(200).json( new ApiResponse(200, approvalUrl) );
        }
        
        // return res.status(500).json({
        //   error: 'Approval URL not found.'
        // });
        throw new ApiError(500, 'Approval URL not found.');
      });
    };


// TODO: PayPal paypal/api/success
export const  getPayPalSuccess = (req, res) => {
    const { paymentId } = req.session;
    const paymentDetails = { payer_id: req.query.PayerID };
  
    paypal.payment.execute(paymentId, paymentDetails, (err) => {
      if (err) {
        throw new ApiError(400, 'Failed to execute payment', err.message);
      }
    //   return res.status(200).json({
    //     result: true,
    //     success: true
    //   });
      return res.status(200).json( new ApiResponse(200, true, true) );
    });
  };


//TODO: PayPal paypal/api/cancel
export const  getPayPalCancel = (req, res) => {
    req.session.paymentId = null;
    return res.status(200).json( new ApiResponse(200, true, true) );
  };



//TODO: Lob API
//* GET /api/lob
export const  getLob = async (req, res, next) => {
    const config = new LobConfiguration({
      username: process.env.LOB_KEY,
    });
  
    let recipientName;
    if (req.user) { recipientName = req.user.profile.name; } else { recipientName = 'John Doe'; }
    const addressTo = {
      name: recipientName || 'Developer',
      address_line1: '123 Main Street',
      address_city: 'New York',
      address_state: 'NY',
      address_zip: '94107'
    };
    const addressFrom = {
      name: 'Hackathon Starter',
      address_line1: '305 Harrison St',
      address_city: 'Seattle',
      address_state: 'WA',
      address_zip: '98109',
      address_country: 'US'
    };
  
    const zipData = new ZipEditable({
      zip_code: addressTo.address_zip
    });
  
    const letterData = new LetterEditable({
      use_type: 'operational',
      to: addressTo,
      from: addressFrom,
      file: `<html><head><meta charset="UTF-8"><style>body{width:8.5in;height:11in;margin:0;padding:0}.page{page-break-after:always;position:relative;width:8.5in;height:11in}.page-content{position:absolute;width:8.125in;height:10.625in;left:1in;top:1in}.text{position:relative;left:20px;top:3in;width:6in;font-size:14px}</style></head>
            <body><div class="page"><div class="page-content"><div class="text">
            Hello ${addressTo.name}, <p> We would like to welcome you to the community! Thanks for being a part of the team! <p><p> Cheer,<br>${addressFrom.name}
            </div></div></div></body></html>`,
      color: false
    });
  
    try {
      const uspsLetter = await new LettersApi(config).create(letterData);
      const zipDetails = await new ZipLookupsApi(config).lookup(zipData);
      
    //   res.status(200).json({
    //     title: 'Lob API',
    //     zipDetails,
    //     uspsLetter,
    //   });
      return res.status(200).json( new ApiResponse(200, 'Lob API', zipDetails, uspsLetter) );
    } catch (error) {
      next(error);
    }
  };



/**
 * GET /api/pinterest
 * Pinterest API example.
 */
export const  getPinterest = async (req, res, next) => {
    try {
      const token = req.user.tokens.find((token) => token.kind === 'pinterest');
      const response = await axios.get(`https://api.pinterest.com/v1/me/boards?access_token=${token.accessToken}`);
    //   res.status(200).json({
    //     title: 'Pinterest API',
    //     boards: response.data.data
    //   });
      return res.status(200).json( new ApiResponse(200, 'Pinterest API', response.data.data) );
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * POST /api/pinterest
   * Create a pin.
   */
  export const  postPinterest = (req, res, next) => {
    const validationErrors = [];
    if (validator.isEmpty(req.body.board)) validationErrors.push({ msg: 'Board is required.' });
    if (validator.isEmpty(req.body.note)) validationErrors.push({ msg: 'Note cannot be blank.' });
    if (validator.isEmpty(req.body.image_url)) validationErrors.push({ msg: 'Image URL cannot be blank.' });
  
    if (validationErrors.length) {
    //   return res.status(400).json({
    //     success: false,
    //     errors: validationErrors
    //   });
      throw new ApiError(400, validationErrors);
    }
  
    const token = req.user.tokens.find((token) => token.kind === 'pinterest');
    const formData = {
      board: req.body.board,
      note: req.body.note,
      link: req.body.link,
      image_url: req.body.image_url
    };
  
    axios.post(`https://api.pinterest.com/v1/pins/?access_token=${token.accessToken}`, formData)
      .then(() => {
        // res.status(200).json({
        //   success: true,
        //   message: 'Pin created successfully'
        // });
        return res.status(200).json( new ApiResponse(200, 'Pin created successfully') );
      })
      .catch((error) => {
        // res.status(400).json({
        //   success: false,
        //   message: error.response.data.message
        // });
        throw new ApiError(400, error.response.data.message);
      });
  };



/**
 * GET /api/here-maps
 * Here Maps API example.
 */
export const  getHereMaps = (req, res) => {
    res.status(200).json({
      title: 'Here Maps API',
      app_id: process.env.HERE_APP_ID,
      app_code: process.env.HERE_APP_CODE
    });
  };
  
  /**
   * GET /api/google-maps
   * Google Maps API example.
   */
  export const  getGoogleMaps = (req, res) => {
    res.status(200).json({
      title: 'Google Maps API',
      google_map_api_key: process.env.GOOGLE_MAP_API_KEY
    });
  };
  
  /**
   * GET /api/google-drive
   * Google Drive API example.
   */
  export const  getGoogleDrive = (req, res, next) => {
    const token = req.user.tokens.find((token) => token.kind === 'google');
    const authObj = new googledrive.auth.OAuth2({
      access_type: 'offline'
    });
    authObj.setCredentials({
      access_token: token.accessToken
    });
  
    const drive = googledrive.drive({
      version: 'v3',
      auth: authObj
    });
  
    drive.files.list({
      fields: 'files(iconLink, webViewLink, name)'
    }, (err, response) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({
        title: 'Google Drive API',
        files: response.data.files
      });
    });
  };
  
  /**
   * GET /api/google-sheets
   * Google Sheets API example.
   */
  export const  getGoogleSheets = (req, res, next) => {
    const token = req.user.tokens.find((token) => token.kind === 'google');
    const authObj = new googlesheets.auth.OAuth2({
      access_type: 'offline'
    });
    authObj.setCredentials({
      access_token: token.accessToken
    });
  
    const sheets = googlesheets.sheets({
      version: 'v4',
      auth: authObj
    });
  
    const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    const re = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const id = url.match(re)[1];
  
    sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: 'Class Data!A1:F',
    }, (err, response) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({
        title: 'Google Sheets API',
        values: response.data.values
      });
    });
  };
  

  export {
    
  }