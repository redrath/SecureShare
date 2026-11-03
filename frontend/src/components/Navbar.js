import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { clearUnlockedPrivateKey } from '../utils/crypto';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUnlockedPrivateKey();
    // Clear tokens and navigate to login
    document.cookie = "access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate('/'); // Redirect to home/login page
  };

  return (
    <nav className="navbar">
      <span className="brand-name">SafeStream</span> {/* Left Side */}
      <button className="logout-btn" onClick={handleLogout}>Logout</button> {/* Right Side */}
    </nav>
  );
};

export default Navbar;
