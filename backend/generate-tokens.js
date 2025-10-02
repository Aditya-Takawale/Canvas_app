const jwt = require('jsonwebtoken');

// Generate tokens for both users
const userToken = jwt.sign({userId: 2, email: 'user@example.com'}, 'your-super-secret-jwt-key-here');
const adminToken = jwt.sign({userId: 1, email: 'admin@example.com'}, 'your-super-secret-jwt-key-here');

console.log('User token (ID: 2):', userToken);
console.log('Admin token (ID: 1):', adminToken);