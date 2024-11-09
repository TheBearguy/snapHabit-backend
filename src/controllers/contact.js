import axios from "axios";
import validator from "validator";
import nodemailer from "nodemailer";


//TODO: Send a contact form via Nodemailer.
export const postContact = async (req, res) => {
    const validationErrors = [];
    let fromName;
    let fromEmail;
    if (!req.user) {
      if (validator.isEmpty(req.body.name)) validationErrors.push({ msg: 'Please enter your name' });
      if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    }
    if (validator.isEmpty(req.body.message)) validationErrors.push({ msg: 'Please enter your message.' });
  
    function getValidateReCAPTCHA(token) {
      return axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
        {},
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
        });
    }
  
    try {
      const validateReCAPTCHA = await getValidateReCAPTCHA(req.body['g-recaptcha-response']);
      if (!validateReCAPTCHA.data.success) {
        validationErrors.push({ msg: 'reCAPTCHA validation failed.' });
      }
  
      if (validationErrors.length) {
        // return res.status(400).json({ errors: validationErrors });
        throw new ApiError(400, validationErrors);
      }
  
      if (!req.user) {
        fromName = req.body.name;
        fromEmail = req.body.email;
      } else {
        fromName = req.user.profile.name || '';
        fromEmail = req.user.email;
      }
  
      const transportConfig = {
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      };
  
      let transporter = nodemailer.createTransport(transportConfig);
  
      const mailOptions = {
        to: process.env.SITE_CONTACT_EMAIL,
        from: `${fromName} <${fromEmail}>`,
        subject: 'Contact Form | Hackathon Starter',
        text: req.body.message
      };
  
      const sendMail = async () => {
        try {
          await transporter.sendMail(mailOptions);
        //   return { msg: 'Email has been sent successfully!' };
          return res.status(200).json( new ApiResponse(200, 'Email has been sent successfully!') );
        } catch (err) {
          if (err.message === 'self signed certificate in certificate chain') {
            console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate.');
            transportConfig.tls = transportConfig.tls || {};
            transportConfig.tls.rejectUnauthorized = false;
            transporter = nodemailer.createTransport(transportConfig);
            await transporter.sendMail(mailOptions);
            // return { msg: 'Email has been sent successfully!' };
            return res.status(200).json( new ApiResponse(200, 'Email has been sent successfully!') );
          }
          console.log('ERROR: Could not send contact email after security downgrade.\n', err);
        //   throw new Error('Error sending the message. Please try again shortly.');
          throw new ApiError(500, 'Error sending the message. Please try again shortly.');
        }
      };
  
      const result = await sendMail();
    //   res.status(200).json(result);
      res.status(200).json( new ApiResponse(200, result) );
    } catch (err) {
      console.log(err);
    //   res.status(500).json({ errors: [{ msg: err.message || 'Something went wrong.' }] });
      res.status(500).json( new ApiResponse(500, err.message || 'Something went wrong.') );
    }
  };
  
//TODO: Contact form page. Can delete this later.
  export const getContact = (req, res) => {
    const unknownUser = !(req.user);  
    res.status(200).json({
      title: 'Contact',
      sitekey: process.env.RECAPTCHA_SITE_KEY,
      unknownUser,
    });
  };