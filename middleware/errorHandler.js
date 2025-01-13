const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'Image upload error',
      error: err.message
    });
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;
