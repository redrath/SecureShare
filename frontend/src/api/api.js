import axios from 'axios';
import store from '../redux/store';
import { setToken, logout } from '../redux/authSlice';

const api = axios.create({
  baseURL: 'https://secureshare-v4gy.onrender.com',
  withCredentials: true,
});

// Request Interceptor to include Authorization headers
api.interceptors.request.use(
  async (config) => {
    const { token } = store.getState().auth;

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { refreshToken } = store.getState().auth;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      try {
        const response = await api.post('/refresh-token/', { refresh: refreshToken });
        store.dispatch(setToken(response.data));
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  }
);

// Fetch QR code
export const fetchQR = async (email) => {
  const response = await fetch(`https://secureshare-v4gy.onrender.com/get-qr/${email}/`);

  if (!response.ok) {
    throw new Error('Failed to fetch QR code');
  }

  return await response.blob();
};

// Validate OTP
export const validateOTP = async (email, otp) => {
    const response = await api.post(`/validate-otp/${email}/`, { otp });
    return response.data;
};


export default api;