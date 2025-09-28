/**
 * Validation Service for Compy 2.0
 * 
 * This service provides centralized validation logic for all user inputs,
 * imported data, and security-critical operations. It implements defense-in-depth
 * security patterns to prevent XSS, CSV injection, and other attack vectors.
 * 
 * Features:
 * - Input sanitization and validation
 * - Security pattern detection
 * - CSV injection prevention
 * - XSS attack prevention
 * - Content length and structure validation
 * 
 * @fileoverview Centralized validation service with security features
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.2';

/**
 * Comprehensive validation service for security and data integrity
 * 
 * This service acts as the gatekeeper for all data entering the system,
 * ensuring that malicious content is blocked and data meets quality standards.
 */
export class ValidationService {
  constructor() {
    // Security patterns for detecting malicious content
    this.securityPatterns = {
      // CSV injection patterns
      csvInjection: [
        /^[=@+\-]/,           // Formula injection (Excel/Calc)
        /javascript:/i,       // JavaScript URIs
        /data:text\/html/i,   // HTML data URIs
      ],
      
      // XSS patterns
      xssPatterns: [
        /<script/i,           // Script tags
        /on\w+=/i,            // Event handlers (onclick, onload, etc.)
        /<iframe/i,           // Iframe tags
        /<object/i,           // Object tags
        /<embed/i,            // Embed tags
        /<link/i,             // Link tags
        /<style/i,            // Style tags
        /\\x[0-9a-fA-F]{2}/,  // Hex escapes
        /\\u[0-9a-fA-F]{4}/   // Unicode escapes
      ],
      
      // Suspicious JavaScript patterns
      jsPatterns: [
        /\beval\s*\(/i,        // eval() function calls
        /\bsetTimeout\s*\(/i,  // setTimeout calls with strings
        /\bsetInterval\s*\(/i, // setInterval calls with strings
        /\bFunction\s*\(/i,    // Function constructor
        /\bunescape\s*\(/i,    // unescape calls
        /\bdocument\./i,       // Document object access
        /\bwindow\./i,         // Window object access
        /\balert\s*\(/i,       // Alert calls
        /\bconfirm\s*\(/i,     // Confirm calls
        /\bprompt\s*\(/i       // Prompt calls
      ]
    };
    
    // Validation limits
    this.limits = {
      textMaxLength: 10000,
      descMaxLength: 1000,
      tagMaxLength: 50,
      maxTags: 50,
      profileMaxLength: 100
    };
  }
  
  /**
   * Validate a snippet item with comprehensive security checks
   * 
   * @param {Object} item - Item to validate
   * @param {string} item.text - Snippet text content
   * @param {string} item.desc - Snippet description
   * @param {boolean} item.sensitive - Whether snippet is sensitive
   * @param {string[]} item.tags - Array of tags
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validateItem(item) {
    const errors = [];
    
    try {
      // Validate required fields
      if (!item || typeof item !== 'object') {
        errors.push('Item must be a valid object');
        return { isValid: false, errors };
      }
      
      // Validate text field
      const textValidation = this.validateTextField(item.text, 'text', this.limits.textMaxLength);
      errors.push(...textValidation.errors);
      
      // Validate description field
      const descValidation = this.validateTextField(item.desc, 'description', this.limits.descMaxLength, true);
      errors.push(...descValidation.errors);
      
      // Validate sensitive flag
      if (item.sensitive !== undefined && typeof item.sensitive !== 'boolean') {
        errors.push('Sensitive flag must be a boolean value');
      }
      
      // Validate tags array
      const tagsValidation = this.validateTagsArray(item.tags);
      errors.push(...tagsValidation.errors);
      
      return {
        isValid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      Logger.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to unexpected error']
      };
    }
  }
  
  /**
   * Validate and sanitize imported data with security focus
   * 
   * @param {Object} data - Raw imported data
   * @returns {Object|null} Sanitized data or null if malicious content detected
   */
  validateAndSanitizeImport(data) {
    try {
      if (!data || typeof data !== 'object') {
        Logger.warn('Invalid import data structure');
        return null;
      }
      
      const sanitized = {
        text: this.sanitizeString(data.text || ''),
        desc: this.sanitizeString(data.desc || ''),
        sensitive: Boolean(data.sensitive),
        tags: Array.isArray(data.tags) ? data.tags : [],
        position: Number(data.position) || 0
      };
      
      // Security validation for text field
      if (!this.isContentSecure(sanitized.text, 'text')) {
        Logger.warn('Blocked malicious text content:', sanitized.text);
        return null;
      }
      
      // Security validation for description
      if (!this.isContentSecure(sanitized.desc, 'description')) {
        Logger.warn('Blocked malicious description:', sanitized.desc);
        return null;
      }
      
      // Length validations
      if (sanitized.text.length > this.limits.textMaxLength) {
        Logger.warn('Blocked oversized text content');
        return null;
      }
      
      if (sanitized.desc.length > this.limits.descMaxLength) {
        Logger.warn('Blocked oversized description');
        return null;
      }
      
      // Sanitize and validate tags
      sanitized.tags = this.sanitizeTagsArray(sanitized.tags);
      if (sanitized.tags === null) {
        Logger.warn('Blocked due to malicious tags');
        return null;
      }
      
      // Check combined content for suspicious patterns
      if (!this.isContentSecure(`${sanitized.text} ${sanitized.desc} ${sanitized.tags.join(' ')}`, 'combined')) {
        Logger.warn('Blocked content with suspicious patterns');
        return null;
      }
      
      return sanitized;
      
    } catch (error) {
      Logger.error('Import validation error:', error);
      return null;
    }
  }
  
  /**
   * Validate profile name with security checks
   * 
   * @param {string} profileName - Profile name to validate
   * @returns {Object} Validation result
   */
  validateProfileName(profileName) {
    const errors = [];
    
    if (profileName === null || profileName === undefined) {
      return { isValid: true, errors: [], sanitized: '' };
    }
    
    if (typeof profileName !== 'string') {
      errors.push('Profile name must be a string');
      return { isValid: false, errors };
    }
    
    const trimmed = profileName.trim();
    
    if (trimmed.length > this.limits.profileMaxLength) {
      errors.push(`Profile name cannot exceed ${this.limits.profileMaxLength} characters`);
    }
    
    // Security pattern check
    if (!this.isContentSecure(trimmed, 'profile')) {
      errors.push('Profile name contains invalid or potentially dangerous content');
    }
    
    // Additional security checks
    if (/<[^>]*>/g.test(trimmed)) {
      errors.push('Profile name cannot contain HTML tags');
    }
    
    const safePattern = /^[a-zA-Z0-9\s\-_.,']*$/;
    if (trimmed.length > 0 && !safePattern.test(trimmed)) {
      errors.push('Profile name contains invalid characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized: trimmed
    };
  }
  
  /**
   * Validate a text field with security and length checks
   * 
   * @param {any} text - Text to validate
   * @param {string} fieldName - Field name for error messages
   * @param {number} maxLength - Maximum allowed length
   * @param {boolean} allowEmpty - Whether empty strings are allowed
   * @returns {Object} Validation result
   * @private
   */
  validateTextField(text, fieldName, maxLength, allowEmpty = false) {
    const errors = [];
    
    if (text === null || text === undefined) {
      if (!allowEmpty) {
        errors.push(`${fieldName} is required`);
      }
      return { isValid: allowEmpty, errors };
    }
    
    if (typeof text !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return { isValid: false, errors };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length === 0 && !allowEmpty) {
      errors.push(`${fieldName} cannot be empty`);
    }
    
    if (trimmed.length > maxLength) {
      errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
    }
    
    // Security validation
    if (!this.isContentSecure(trimmed, fieldName)) {
      errors.push(`${fieldName} contains potentially dangerous content`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate tags array with security and structure checks
   * 
   * @param {any} tags - Tags array to validate
   * @returns {Object} Validation result
   * @private
   */
  validateTagsArray(tags) {
    const errors = [];
    
    if (tags === null || tags === undefined) {
      return { isValid: true, errors };
    }
    
    if (!Array.isArray(tags)) {
      errors.push('Tags must be an array');
      return { isValid: false, errors };
    }
    
    if (tags.length > this.limits.maxTags) {
      errors.push(`Cannot have more than ${this.limits.maxTags} tags`);
    }
    
    // Validate each tag
    const seenTags = new Set();
    tags.forEach((tag, index) => {
      const tagErrors = this.validateSingleTag(tag, index + 1, seenTags);
      errors.push(...tagErrors);
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate a single tag with content and security checks
   * 
   * @param {any} tag - Tag to validate
   * @param {number} index - Tag index for error messages
   * @param {Set} seenTags - Set of normalized tags for duplicate detection
   * @returns {string[]} Array of validation errors
   * @private
   */
  validateSingleTag(tag, index, seenTags) {
    const errors = [];
    
    if (typeof tag !== 'string') {
      errors.push(`Tag ${index} must be a string`);
      return errors;
    }
    
    const trimmed = tag.trim();
    
    if (trimmed.length === 0) {
      errors.push(`Tag ${index} cannot be empty`);
      return errors;
    }
    
    if (trimmed.length > this.limits.tagMaxLength) {
      errors.push(`Tag ${index} cannot exceed ${this.limits.tagMaxLength} characters`);
    }
    
    // Security validation
    if (!this.isContentSecure(trimmed, `tag ${index}`)) {
      errors.push(`Tag ${index} contains potentially dangerous content`);
    }
    
    // Content validation - more restrictive for tags
    const safeTagPattern = /^[a-zA-Z0-9\-_.#\s]+$/;
    if (!safeTagPattern.test(trimmed)) {
      errors.push(`Tag ${index} contains invalid characters`);
    }
    
    // Duplicate detection
    const normalized = trimmed.toLowerCase();
    if (seenTags.has(normalized)) {
      errors.push(`Duplicate tag: "${trimmed}"`);
    } else {
      seenTags.add(normalized);
    }
    
    return errors;
  }
  
  /**
   * Check if content is secure (no malicious patterns)
   * 
   * @param {string} content - Content to check
   * @param {string} context - Context for logging
   * @returns {boolean} True if content is secure
   * @private
   */
  isContentSecure(content, context) {
    if (!content || typeof content !== 'string') {
      return true;
    }
    
    // Check CSV injection patterns
    if (this.securityPatterns.csvInjection.some(pattern => pattern.test(content))) {
      Logger.warn(`CSV injection detected in ${context}:`, content);
      return false;
    }
    
    // Check XSS patterns
    if (this.securityPatterns.xssPatterns.some(pattern => pattern.test(content))) {
      Logger.warn(`XSS pattern detected in ${context}:`, content);
      return false;
    }
    
    // Check JavaScript patterns
    if (this.securityPatterns.jsPatterns.some(pattern => pattern.test(content))) {
      Logger.warn(`Suspicious JavaScript pattern detected in ${context}:`, content);
      return false;
    }
    
    return true;
  }
  
  /**
   * Sanitize a string by trimming and basic cleanup
   * 
   * @param {any} input - Input to sanitize
   * @returns {string} Sanitized string
   * @private
   */
  sanitizeString(input) {
    return String(input || '').trim();
  }
  
  /**
   * Sanitize and validate tags array
   * 
   * @param {any[]} tags - Tags array to sanitize
   * @returns {string[]|null} Sanitized tags array or null if malicious
   * @private
   */
  sanitizeTagsArray(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }
    
    const sanitized = tags
      .map(tag => this.sanitizeString(tag))
      .filter(tag => {
        if (tag.length === 0 || tag.length > this.limits.tagMaxLength) {
          return false;
        }
        
        if (!this.isContentSecure(tag, 'tag')) {
          return false;
        }
        
        return true;
      })
      .slice(0, this.limits.maxTags); // Limit total tags
    
    return sanitized;
  }
  
  /**
   * Get validation limits for external use
   * 
   * @returns {Object} Validation limits
   */
  getLimits() {
    return { ...this.limits };
  }
  
  /**
   * Update validation limits (for testing or configuration)
   * 
   * @param {Object} newLimits - New limits to apply
   */
  updateLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
  }
}