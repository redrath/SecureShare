import axios from 'axios';
import store from '../redux/store';
import { setToken, logout } from '../redux/authSlice';

const fileapi = axios.create({
  baseURL: 'https://secureshare-v4gy.onrender.com',
  withCredentials: true,
});

// Request Interceptor to include Authorization headers
fileapi.interceptors.request.use(
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
fileapi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { refreshToken } = store.getState().auth;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      try {
        const response = await fileapi.post('/login/', { refresh: refreshToken });
        store.dispatch(setToken(response.data));
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return fileapi(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  }
);

// Fetch files from the backend
export const fetchFiles = async (email) => {
  try {
    const response = await fileapi.get(`/fileslist/${email}/`);
    return response.data.files;
  } catch (error) {
    throw new Error('Error fetching files');
  }
};


export async function getUsers(email) {
  try {
    const response = await fileapi.get(`/users/${email}/`);
    return response.data.users;
  } catch (error) {
    throw new Error('Error fetching users');
  }
};

// Upload file to the backend
export const uploadFile = async (formData) => {
  try {
    const response = await fileapi.post(`/upload-file/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw new Error('File already exists');
  }
};

// Decrypt and download the file from the backend
export const decryptFile = async (fileName) => {
  try {
    const response = await fileapi.get(`/decrypt-file/${fileName}/`, {
      responseType: 'blob',  // Important for binary data
    });
    return response.data;
  } catch (error) {
    throw new Error('Error downloading the file');
  }
};


export const fetchSharedFileData = async (sender) => {
  try {
    const response = await fileapi.get(`/shared-files/${sender}/`);
    return response.data; // Return the entire data as-is
  } catch (error) {
    throw new Error("Error fetching shared files");
  }
};
