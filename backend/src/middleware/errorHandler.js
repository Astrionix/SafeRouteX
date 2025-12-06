// Global error handler middleware
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: err.details
        });
    }

    // Database errors
    if (err.code && err.code.startsWith('23')) {
        // PostgreSQL constraint violation
        return res.status(400).json({
            error: 'Database Error',
            message: 'Data constraint violation',
            code: err.code
        });
    }

    // Firebase auth errors
    if (err.code && err.code.startsWith('auth/')) {
        return res.status(401).json({
            error: 'Authentication Error',
            message: err.message
        });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: 'Server Error',
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

// Async handler wrapper
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Custom error class
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
