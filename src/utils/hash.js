import bcrypt from 'bcrypt';

export const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (plain, hashed) => {
  // Validate both parameters exist
  if (!plain || !hashed) {
    throw new Error('Both password and hash are required for comparison');
  }
  
  // Ensure both are strings
  if (typeof plain !== 'string' || typeof hashed !== 'string') {
    throw new Error('Password and hash must be strings');
  }
  
  return bcrypt.compare(plain, hashed);
};
