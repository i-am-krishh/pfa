import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

export const registerUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { phoneNumber }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or phone number already exists' 
            });
        }

        // Create new user
        const user = new User({
            fullName,
            email,
            phoneNumber,
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error registering user' 
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and select password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Compare password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                currency: user.currency
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error logging in' 
        });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching user' 
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { fullName, phoneNumber, address, city, state, zipCode, currency } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            {
                fullName,
                phoneNumber,
                address,
                city,
                state,
                zipCode,
                currency,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating profile' 
        });
    }
};
