import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Handle legacy bcrypt hashes (from previous implementation)
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    try {
      return await bcrypt.compare(supplied, stored);
    } catch (error) {
      // Return false for invalid bcrypt hashes
      return false;
    }
  }
  
  // Handle current scrypt hashes (format: {hex}.{salt})
  try {
    // Validate scrypt format: must contain exactly one dot separator
    const parts = stored.split(".");
    if (parts.length !== 2) {
      return false;
    }
    
    const [hashed, salt] = parts;
    
    // Validate hex digest length (64 bytes = 128 hex characters)
    if (!hashed || hashed.length !== 128 || !/^[0-9a-f]+$/i.test(hashed)) {
      return false;
    }
    
    // Validate salt is exactly 32 hex characters (16 bytes) to match hashPassword
    if (!salt || salt.length !== 32 || !/^[0-9a-f]+$/i.test(salt)) {
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure buffers have same length before timing-safe comparison
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    // Return false for any malformed hash or unexpected errors
    return false;
  }
}
