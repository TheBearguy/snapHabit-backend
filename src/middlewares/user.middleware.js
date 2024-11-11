import User from '../models/user.model.js';

export const getUserIdByEmail = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.query.userId = user._id;
        console.log(req.query, "req.params.followId");
        req.query.followId = req.params.followId;

        next();
    } catch (error) {
        console.error('Error finding user by email:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};