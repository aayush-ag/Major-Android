export const basicAuth = `Basic ${btoa('admin:KHtj9wOh3WUtHDnM3thIzNDkmk3eDn5z')}`;
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_settings';

// Function to get the API Endpoint
export const getApiEndpoint = async () => {
    try {
        const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
            const { apiEndpoint } = JSON.parse(savedSettings);
            return apiEndpoint; // Return the stored API Endpoint
        }
        return 'https://major.waferclabs.com:16384'; // Default API Endpoint (fallback)
    } catch (error) {
        console.error('Error retrieving API Endpoint:', error);
        return 'https://major.waferclabs.com:16384'; // Default API Endpoint (fallback)
    }
};

export const getName = async () => {
    try {
        const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
            const { name } = JSON.parse(savedSettings);
            return name || ''; // Return the stored name or an empty string if not set
        }
        return ''; // Default empty value if no settings are stored
    } catch (error) {
        console.error('Error retrieving name:', error);
        return ''; // Default empty value on error
    }
};