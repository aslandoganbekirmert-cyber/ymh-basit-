export const API_BASE_URL = 'http://34.173.32.137/api/v1';

export const fetchAPI = async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return response.json();
};
