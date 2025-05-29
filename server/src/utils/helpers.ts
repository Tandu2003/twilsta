import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { config } from '../config/database';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Password utilities
export class PasswordUtils {
  // Hash password
  static async hash(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async compare(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate random password
  static generateRandom(length: number = 12): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Validate password strength
  static validateStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }
}

// JWT utilities
export class TokenUtils {
  // Generate access token
  static generateAccessToken(payload: any): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'twilsta',
      audience: 'twilsta-users',
    });
  }

  // Generate refresh token
  static generateRefreshToken(payload: any): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: '30d',
      issuer: 'twilsta',
      audience: 'twilsta-users',
    });
  }

  // Verify access token
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Generate email verification token
  static generateEmailToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate reset password token
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate API key
  static generateApiKey(): string {
    return `tw_${crypto.randomBytes(24).toString('hex')}`;
  }
}

// String utilities
export class StringUtils {
  // Generate slug from text
  static generateSlug(text: string): string {
    return slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }

  // Generate unique username
  static generateUsername(name: string): string {
    const baseUsername = this.generateSlug(name);
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseUsername}${randomSuffix}`;
  }

  // Sanitize HTML content
  static sanitizeHtml(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  // Extract hashtags from text
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
  }

  // Extract mentions from text
  static extractMentions(text: string): string[] {
    const mentionRegex = /@[\w.]+/g;
    const matches = text.match(mentionRegex);
    return matches
      ? matches.map((mention) => mention.slice(1).toLowerCase())
      : [];
  }

  // Truncate text
  static truncate(
    text: string,
    length: number = 100,
    suffix: string = '...'
  ): string {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
  }

  // Generate random string
  static generateRandom(length: number = 10): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  // Capitalize first letter
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}

// Date utilities
export class DateUtils {
  // Format date
  static format(
    date: Date | string,
    format: string = 'YYYY-MM-DD HH:mm:ss'
  ): string {
    return dayjs(date).format(format);
  }

  // Get time ago
  static timeAgo(date: Date | string): string {
    const now = dayjs();
    const targetDate = dayjs(date);
    const diffInMinutes = now.diff(targetDate, 'minute');

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d`;
    if (diffInMinutes < 525600) return `${Math.floor(diffInMinutes / 43200)}w`;
    return `${Math.floor(diffInMinutes / 525600)}y`;
  }

  // Check if date is today
  static isToday(date: Date | string): boolean {
    return dayjs().isSame(dayjs(date), 'day');
  }

  // Check if date is this week
  static isThisWeek(date: Date | string): boolean {
    return dayjs().isSame(dayjs(date), 'week');
  }

  // Get start of day
  static startOfDay(date?: Date | string): Date {
    return dayjs(date).startOf('day').toDate();
  }

  // Get end of day
  static endOfDay(date?: Date | string): Date {
    return dayjs(date).endOf('day').toDate();
  }

  // Add time to date
  static addTime(date: Date | string, amount: number, unit: any): Date {
    return dayjs(date).add(amount, unit).toDate();
  }

  // Subtract time from date
  static subtractTime(date: Date | string, amount: number, unit: any): Date {
    return dayjs(date).subtract(amount, unit).toDate();
  }
}

// Number utilities
export class NumberUtils {
  // Format number with commas
  static formatWithCommas(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate random number between range
  static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Round to decimal places
  static roundTo(num: number, decimals: number = 2): number {
    return Number(
      Math.round(parseFloat(num + 'e' + decimals)) + 'e-' + decimals
    );
  }
}

// Array utilities
export class ArrayUtils {
  // Shuffle array
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Get unique items
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  // Chunk array
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Get random item
  static random<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Remove duplicates by property
  static uniqueBy<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
}

// Object utilities
export class ObjectUtils {
  // Deep clone object
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Pick properties from object
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  // Omit properties from object
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  }

  // Check if object is empty
  static isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  // Flatten nested object
  static flatten(obj: any, prefix: string = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          Object.assign(flattened, this.flatten(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }
}

// Validation utilities
export class ValidationUtils {
  // Validate email
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  // Validate URL
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validate username
  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;
    return usernameRegex.test(username);
  }

  // Validate UUID
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

// General utilities
export class Utils {
  // Generate UUID
  static generateUUID(): string {
    return uuidv4();
  }

  // Sleep function
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Retry function with exponential backoff
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  // Debounce function
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}
