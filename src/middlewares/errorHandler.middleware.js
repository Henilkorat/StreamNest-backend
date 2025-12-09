// Error handler middleware to suppress expected 401 errors for /users/current-user
// This prevents spam in terminal logs when users are not logged in (expected state)

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    
    // Suppress logging for expected 401s on /users/current-user endpoint
    // These are normal when user is not logged in, not actual errors
    const isExpected401 = statusCode === 401 && 
                         req.path === '/api/v1/users/current-user' &&
                         message === 'Unauthorized request'
    
    // Only log unexpected errors or non-401 errors
    if (!isExpected401) {
        console.error(`[${statusCode}] ${req.method} ${req.path}: ${message}`)
    }
    
    // Always send proper error response to client
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && !isExpected401 && { stack: err.stack })
    })
}
