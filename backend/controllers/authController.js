import User from '../models/User.js';
import FamilyGroup from '../models/FamilyGroup.js';
import { generateToken } from '../middleware/auth.js';
import { sendVerificationOtp, send2FAOtp, sendResetPasswordOtp } from '../services/emailService.js';

export const registerUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { phoneNumber }] 
        });

        if (existingUser) {
            // If the existing user is already verified, reject registration
            if (existingUser.isVerified) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User with this email or phone number already exists' 
                });
            }
            
            // If they are not verified, we allow updating registration details and sending a new OTP
            existingUser.fullName = fullName;
            existingUser.phoneNumber = phoneNumber;
            existingUser.password = password; // Pre-save hook will hash this
            
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            existingUser.otp = otp;
            existingUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
            existingUser.otpAttempts = 0;

            await existingUser.save();
            await sendVerificationOtp(email, otp);

            return res.status(200).json({
                success: true,
                message: 'Account is unverified. A new verification OTP has been sent to your email.',
                email: existingUser.email
            });
        }

        // Create new user with isVerified = false
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new User({
            fullName,
            email,
            phoneNumber,
            password,
            isVerified: false,
            otp,
            otpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
            otpAttempts: 0
        });

        await user.save();
        await sendVerificationOtp(email, otp);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Verification OTP sent to email.',
            email: user.email
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

        // Check if email is verified
        if (!user.isVerified) {
            // Generate OTP for verification
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
            user.otpAttempts = 0;
            await user.save();
            
            await sendVerificationOtp(user.email, otp);

            return res.status(403).json({ 
                success: false, 
                message: 'Please verify your email first. A verification code has been sent.',
                unverified: true,
                email: user.email
            });
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
            user.otpAttempts = 0;
            await user.save();

            await send2FAOtp(user.email, otp);

            return res.status(200).json({
                success: true,
                require2FA: true,
                email: user.email,
                message: 'Two-factor authentication code sent to email.'
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
                currency: user.currency,
                twoFactorEnabled: user.twoFactorEnabled,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error logging in' 
        });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not registered'
            });
        }

        // Check if active OTP exists
        if (!user.otp) {
            return res.status(400).json({
                success: false,
                message: 'No active OTP found. Please request a new code.'
            });
        }

        // Expiry check
        if (Date.now() > user.otpExpires) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });
        }

        // Attempts check
        if (user.otpAttempts >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum OTP attempts reached. Please request a new code.'
            });
        }

        if (user.otp !== otp) {
            user.otpAttempts += 1;
            await user.save();
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`
            });
        }

        // OTP is correct! Verify user
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        await user.save();

        // Generate token so they login directly after registration or 2FA
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                currency: user.currency,
                twoFactorEnabled: user.twoFactorEnabled,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error verifying OTP'
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not registered'
            });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        user.otpAttempts = 0;

        await user.save();

        // If they are setting up 2FA, send 2FA mail; else send registration verification mail
        if (user.isVerified && user.twoFactorEnabled) {
            await send2FAOtp(user.email, otp);
        } else {
            await sendVerificationOtp(user.email, otp);
        }

        res.status(200).json({
            success: true,
            message: 'A new OTP has been sent to your email.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error resending OTP'
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not registered'
            });
        }

        // Generate reset OTP
        const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = resetOtp;
        user.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        user.resetOtpAttempts = 0;

        await user.save();
        await sendResetPasswordOtp(user.email, resetOtp);

        res.status(200).json({
            success: true,
            message: 'Password reset OTP has been sent to your email.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error sending password reset OTP'
        });
    }
};

export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not registered'
            });
        }

        if (!user.resetOtp) {
            return res.status(400).json({
                success: false,
                message: 'No active password reset request found.'
            });
        }

        // Expiry check
        if (Date.now() > user.resetOtpExpires) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });
        }

        // Attempts check
        if (user.resetOtpAttempts >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum reset OTP attempts reached. Please request a new code.'
            });
        }

        if (user.resetOtp !== otp) {
            user.resetOtpAttempts += 1;
            await user.save();
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${5 - user.resetOtpAttempts} attempts remaining.`
            });
        }

        // Verify successful
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully. You may now reset your password.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error verifying reset OTP'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not registered'
            });
        }

        if (user.resetOtp !== otp || Date.now() > user.resetOtpExpires || user.resetOtpAttempts >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP. Please start the process again.'
            });
        }

        // Set new password (will be hashed automatically by user schema pre-save hook)
        user.password = newPassword;
        user.resetOtp = null;
        user.resetOtpExpires = null;
        user.resetOtpAttempts = 0;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully. You can now login.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error resetting password'
        });
    }
};

export const toggleTwoFactor = async (req, res) => {
    try {
        const { enabled } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.twoFactorEnabled = !!enabled;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'} successfully`,
            twoFactorEnabled: user.twoFactorEnabled
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error toggling two-factor authentication'
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
        const { 
            fullName, phoneNumber, address, city, state, zipCode, currency,
            dateOfBirth, occupation, monthlyIncomeRange, taxRegime, familyRole, riskAppetite,
            profileImage
        } = req.body;

        const updateData = {
            fullName,
            phoneNumber,
            address,
            city,
            state,
            zipCode,
            currency,
            dateOfBirth,
            occupation,
            monthlyIncomeRange,
            taxRegime,
            familyRole,
            riskAppetite,
            updatedAt: Date.now()
        };

        if (profileImage !== undefined) {
            updateData.profileImage = profileImage;
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
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

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Fetch active approved family group membership dynamically
        const familyGroup = await FamilyGroup.findOne({
            $or: [
                { admin: req.user.userId },
                { 'members.user': req.user.userId, 'members.status': 'Approved' }
            ]
        });

        const userObj = user.toObject();
        if (familyGroup) {
            const myMemberInfo = familyGroup.members.find(m => m.user.toString() === req.user.userId);
            userObj.familyGroup = {
                id: familyGroup._id,
                name: familyGroup.name,
                familyCode: familyGroup.familyCode,
                role: myMemberInfo ? myMemberInfo.role : (familyGroup.admin.toString() === req.user.userId ? 'Admin' : 'Contributor'),
                status: myMemberInfo ? myMemberInfo.status : 'Approved'
            };
            
            // Automatically update user role if not synced or joins family group
            if (!user.familyRole) {
                user.familyRole = familyGroup.admin.toString() === req.user.userId ? 'Family Head' : 'Earning Member';
                await user.save();
                userObj.familyRole = user.familyRole;
            }
        } else {
            userObj.familyGroup = null;
        }

        res.status(200).json({
            success: true,
            user: userObj
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching profile'
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findById(req.user.userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect current password'
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error changing password'
        });
    }
};
