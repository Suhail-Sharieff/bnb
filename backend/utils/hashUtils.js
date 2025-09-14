const { ethers } = require('ethers');
const stableStringify = require('fast-json-stable-stringify');

/**
 * Generate a stable hash from any JavaScript object using keccak256
 * @param {any} data - The data to hash
 * @param {string} algorithm - The hashing algorithm to use ('keccak256' or 'sha256')
 * @returns {string} - The hash as a hex string with 0x prefix
 */
function generateConsistentHash(data, algorithm = 'keccak256') {
  // Create a stable JSON string representation with sorted keys
  const stableString = stableStringify(data);
  
  // Convert to UTF-8 bytes
  const bytes = ethers.toUtf8Bytes(stableString);
  
  // Generate hash based on algorithm
  let hash;
  if (algorithm === 'sha256') {
    // Use ethers.js SHA256 implementation
    hash = ethers.sha256(bytes);
  } else {
    // Default to keccak256
    hash = ethers.keccak256(bytes);
  }
  
  // Ensure it's lowercase with 0x prefix
  return hash.toLowerCase();
}

/**
 * Normalize a hash to ensure it has the correct format (0x + 64 hex chars)
 * @param {string} hash - The hash to normalize
 * @returns {string} - The normalized hash
 */
function normalizeHash(hash) {
  // Remove any existing 0x prefix
  let cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
  
  // Ensure it's lowercase
  cleanHash = cleanHash.toLowerCase();
  
  // Pad with zeros if too short (shouldn't happen with proper hashing)
  while (cleanHash.length < 64) {
    cleanHash = '0' + cleanHash;
  }
  
  // Truncate if too long (shouldn't happen with proper hashing)
  if (cleanHash.length > 64) {
    cleanHash = cleanHash.substring(0, 64);
  }
  
  // Add 0x prefix
  return '0x' + cleanHash;
}

/**
 * Validate that a hash has the correct format (0x + 64 hex chars)
 * @param {string} hash - The hash to validate
 * @returns {boolean} - Whether the hash is valid
 */
function isValidHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  if (!hash.startsWith('0x')) return false;
  if (hash.length !== 66) return false; // 0x + 64 chars
  const hexPart = hash.slice(2);
  return /^[0-9a-f]{64}$/i.test(hexPart);
}

module.exports = {
  generateConsistentHash,
  normalizeHash,
  isValidHash
};