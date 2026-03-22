// Generate pagination metadata
exports.getPaginationData = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

// Format success response
exports.successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

// Format error response
exports.errorResponse = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode
  };
};

// Calculate distance between two coordinates (Haversine formula)
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};
