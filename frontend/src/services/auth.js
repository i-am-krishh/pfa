import { jwtDecode } from 'jwt-decode';

const isTokenExpired = (token) => {
  if (!token) {
    return true;
  }
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const logout = () => {
  localStorage.removeItem('token');
};

const checkAuth = () => {
  const token = localStorage.getItem('token');
  if (isTokenExpired(token)) {
    logout();
    return false;
  }
  return true;
};

export { isTokenExpired, logout, checkAuth };
