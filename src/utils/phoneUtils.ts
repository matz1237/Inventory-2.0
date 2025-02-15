export const standardizePhoneNumber = (phoneNumber: string): string => {
    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 91, ensure it's in the correct format
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
    }
    
    // Add +91 prefix if not present
    if (!cleaned.startsWith('91')) {
        cleaned = '91' + cleaned;
    }
    
    return cleaned;
};

export const getRedisPhoneKey = (phoneNumber: string): string => {
    return standardizePhoneNumber(phoneNumber);
};