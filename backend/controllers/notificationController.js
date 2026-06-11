import Notification from '../models/Notification.js';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';

// Helper to get YYYY-MM list from startDate to currentDate
const getMonthsSince = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];
    
    // Start at the 1st day of the start date month
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (current <= limit) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
        current.setMonth(current.getMonth() + 1);
    }
    return months;
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();

        // Self-healing check: find active loans
        const activeLoans = await Loan.find({ userId, remainingAmount: { $gt: 0 } });

        for (const loan of activeLoans) {
            // Find all months from loan's start date to now
            const loanMonths = getMonthsSince(loan.startDate, now);

            for (const monthStr of loanMonths) {
                // Check if notification already exists for this loan and month
                const existing = await Notification.findOne({
                    userId,
                    type: 'loan_emi',
                    'data.loanId': loan._id,
                    'data.monthStr': monthStr
                });

                if (!existing) {
                    // Create monthly notification
                    const monthDate = new Date(monthStr + '-02'); // Avoid timezone shift
                    const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const cleanType = (loan.type || 'loan').replace(/_/g, ' ');

                    const newNotification = new Notification({
                        userId,
                        type: 'loan_emi',
                        title: `EMI Payment Due - ${loan.lenderName}`,
                        message: `Your monthly EMI of ₹${loan.monthlyEMI.toLocaleString('en-IN')} is due for your ${cleanType} from ${loan.lenderName} for ${monthName}.`,
                        data: {
                            loanId: loan._id,
                            emiAmount: loan.monthlyEMI,
                            monthStr: monthStr
                        },
                        actionStatus: 'pending',
                        isRead: false,
                        createdAt: new Date(monthStr + '-01T08:00:00Z') // Create at the start of that month
                    });

                    await newNotification.save();
                }
            }
        }

        // Return all notifications sorted by date (newest first)
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching notifications'
        });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const notification = await Notification.findOne({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        notification.isRead = true;
        notification.updatedAt = Date.now();
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error marking notification as read'
        });
    }
};

export const payEmi = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const notification = await Notification.findOne({ _id: id, userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.actionStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'EMI already recorded as paid' });
        }

        const loan = await Loan.findOne({ _id: notification.data.loanId, userId });
        if (!loan) {
            return res.status(404).json({ success: false, message: 'Associated loan not found' });
        }

        const emiAmount = notification.data.emiAmount;

        // 1. Update Loan Amounts
        loan.amountPaid = (loan.amountPaid || 0) + emiAmount;
        loan.remainingAmount = Math.max(0, (loan.remainingAmount || 0) - emiAmount);

        // 2. Update next payment date
        if (loan.nextPaymentDate) {
            const nextDate = new Date(loan.nextPaymentDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            loan.nextPaymentDate = nextDate;
        } else {
            const nextDate = new Date(loan.startDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            loan.nextPaymentDate = nextDate;
        }
        loan.updatedAt = Date.now();
        await loan.save();

        // 3. Create Expense Entry
        const monthDate = new Date(notification.data.monthStr + '-02');
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const cleanType = (loan.type || 'loan').replace(/_/g, ' ');

        const newExpense = new Expense({
            userId,
            category: 'loans',
            amount: emiAmount,
            description: `EMI Payment: ${loan.lenderName} (${cleanType}) - ${monthName}`,
            date: new Date(),
            paymentMethod: 'bank_transfer',
            status: 'approved',
            familySync: loan.familySync || { enabled: false }
        });
        await newExpense.save();

        // 4. Update Notification Action Status
        notification.actionStatus = 'paid';
        notification.isRead = true;
        notification.updatedAt = Date.now();
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'EMI payment successfully recorded and expense updated',
            notification,
            loan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing EMI payment'
        });
    }
};
