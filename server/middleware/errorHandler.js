export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Handle CORS errors
    if (err.name === 'CORSError') {
        return res.status(403).json({
            success: false,
            message: 'CORS error: Access denied',
            error: err.message
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(err.errors).map(error => error.message)
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: err.message
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired',
            error: err.message
        });
    }

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value',
            error: Object.keys(err.keyValue).map(key => `${key} already exists`)
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
}; 