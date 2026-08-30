const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    message,
  });
};

const sendPaginated = (res, data, total, page, limit) => {
  res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };