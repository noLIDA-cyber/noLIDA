class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error('ERROR:', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

module.exports = { AppError, errorHandler, notFound };