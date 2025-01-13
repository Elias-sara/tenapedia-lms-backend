const path = require('path');

const getImagePath = (imageName, type = 'course') => {
  if (!imageName) {
    return `/images/default-${type}.jpg`;
  }
  
  // Check if the image is already a full URL
  if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
    return imageName;
  }
  
  // Return the path to the uploaded image
  return `/uploads/${imageName}`;
};

module.exports = { getImagePath }; 