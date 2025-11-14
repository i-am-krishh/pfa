import { body, validationResult } from 'express-validator';

export const validateRegister = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 3 })
        .withMessage('Full name must be at least 3 characters'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('phoneNumber')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be 10 digits'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];

export const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

export const validateExpense = [
    body('category')
        .isIn(['food', 'transport', 'utilities', 'entertainment', 'shopping', 'healthcare', 'education', 'insurance', 'rent', 'other'])
        .withMessage('Invalid category'),
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom(value => value > 0)
        .withMessage('Amount must be greater than 0'),
    body('date')
        .isISO8601()
        .withMessage('Invalid date format'),
];

export const validateIncome = [
    body('source')
        .isIn(['salary', 'freelance', 'investment', 'bonus', 'gift', 'other'])
        .withMessage('Invalid source'),
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom(value => value > 0)
        .withMessage('Amount must be greater than 0'),
    body('date')
        .isISO8601()
        .withMessage('Invalid date format'),
];

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }
    next();
};
