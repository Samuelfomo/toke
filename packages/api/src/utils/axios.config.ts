import axios from 'axios';

const isDev = process.env.NODE_ENV === 'development';
const baseURL = isDev ? `${process.env.SERVER_HOST}:${process.env.PORT}` : process.env.SERVER_HOST;

const api = axios.create({
  baseURL,
  headers: {
    'x-api-key': process.env.API_KEY,
    'x-api-signature': process.env.API_SIGNATURE,
  },
});

export default api;
