export const validators = {
  isValidFlatNumber: (flat: string): boolean => {
    // Format: Alphabet, optional hyphen, 4 digits (e.g. S-3907 or S3907)
    const regex = /^[a-zA-Z]-?\d{4}$/;
    return regex.test(flat.trim());
  },

  normalizeFlatNumber: (flat: string): string => {
    const clean = flat.trim().toUpperCase();
    if (/^[A-Z]\d{4}$/.test(clean)) {
      return `${clean[0]}-${clean.slice(1)}`;
    }
    return clean;
  },

  isValidName: (name: string): boolean => {
    // Only alphabets and spaces, minimum 2 characters
    const trimmed = name.trim();
    const regex = /^[a-zA-Z\s]{2,}$/;
    return regex.test(trimmed);
  },

  isValidPhone: (phone: string): boolean => {
    // Exactly 10 digits and only digits
    const regex = /^\d{10}$/;
    return regex.test(phone.trim());
  },

  isValidPassword: (password: string): boolean => {
    // 1 upper, 1 lower, 1 digit, 1 special character, min length 6
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return regex.test(password.trim());
  }
};
