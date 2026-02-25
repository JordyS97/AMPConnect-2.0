import SecureLS from 'secure-ls';

// Initialize SecureLS with AES encryption
// In a real app, the encryption secret could be derived from an env variable
const ls = new SecureLS({ encodingType: 'aes', isCompression: false, encryptionSecret: import.meta.env.VITE_LS_SECRET || 'ampc-secure-key-123' });

export const secureStorage = {
    setItem: (key, value) => {
        try {
            ls.set(key, value);
        } catch (error) {
            console.error('Error saving to secure storage', error);
        }
    },
    getItem: (key) => {
        try {
            return ls.get(key);
        } catch (error) {
            console.error('Error reading from secure storage', error);
            return null;
        }
    },
    removeItem: (key) => {
        try {
            ls.remove(key);
        } catch (error) {
            console.error('Error removing from secure storage', error);
        }
    },
    clear: () => {
        try {
            ls.removeAll();
        } catch (error) {
            console.error('Error clearing secure storage', error);
        }
    }
};
