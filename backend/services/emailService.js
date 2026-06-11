import nodemailer from 'nodemailer';

// Helper to check if credentials are valid and not the placeholder
const hasValidConfig = () => {
    const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';
    return user && pass && pass.replace(/\s+/g, '') !== 'your_gmail_app_password' && pass !== '';
};

// Create a nodemailer transporter
const getTransporter = () => {
    const user = process.env.EMAIL_USER.trim();
    const pass = process.env.EMAIL_PASS.trim().replace(/\s+/g, ''); // Strip all spaces
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass
        }
    });
};

/**
 * Send an email using Nodemailer or print to console if in development/fallback mode
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 */
export const sendEmail = async (to, subject, text) => {
    if (!hasValidConfig()) {
        console.log('\n==================================================');
        console.log('📬  [EMAIL SERVICE SIMULATION] (No Valid SMTP Credentials)');
        console.log(`To:      ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text}`);
        console.log('==================================================\n');
        return { success: true, simulated: true };
    }

    try {
        const transporter = getTransporter();
        const mailOptions = {
            from: `"FinancePro" <${process.env.EMAIL_USER.trim()}>`,
            to,
            subject,
            text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        if (process.env.NODE_ENV === 'development') {
            console.log('\n==================================================');
            console.log('📬  [DEVELOPMENT EMAIL LOG]');
            console.log(`To:      ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${text}`);
            console.log('==================================================\n');
        }
        return { success: true, info };
    } catch (error) {
        console.warn('\n==================================================');
        console.warn('⚠️  [EMAIL SERVICE FALLBACK] (SMTP Connection/Login Failed)');
        console.warn(`Error:   ${error.message}`);
        console.warn(`To:      ${to}`);
        console.warn(`Subject: ${subject}`);
        console.warn(`Body:\n${text}`);
        console.warn('==================================================\n');
        
        return { success: true, simulated: true, warning: error.message };
    }
};

/**
 * Send registration/verification OTP
 */
export const sendVerificationOtp = async (to, otp) => {
    const subject = 'FinancePro Email Verification';
    const text = `Hello,\n\nYour FinancePro verification code is:\n\n${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.\n\nFinancePro Team`;
    return await sendEmail(to, subject, text);
};

/**
 * Send login 2FA OTP
 */
export const send2FAOtp = async (to, otp) => {
    const subject = 'FinancePro 2FA Verification';
    const text = `Hello,\n\nYour FinancePro login code is:\n\n${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.\n\nFinancePro Team`;
    return await sendEmail(to, subject, text);
};

/**
 * Send password reset OTP
 */
export const sendResetPasswordOtp = async (to, otp) => {
    const subject = 'FinancePro Password Reset';
    const text = `Hello,\n\nYour FinancePro password reset code is:\n\n${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.\n\nFinancePro Team`;
    return await sendEmail(to, subject, text);
};
