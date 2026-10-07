import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import '../styles/AuthRegister.css';
import Navbar from '../components/Navbars';

const AuthRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email } = location.state || {};

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Prevent Back Navigation
    const handleBackNavigation = () => {
      navigate('/home', { replace: true });
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackNavigation);

    return () => {
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchQrCode = async () => {
      if (!email) {
        setError('Email is missing. Please try again.');
        return;
      }

      try {
        const res = await fetch(
          `https://secureshare-v4gy.onrender.com/get-qr/${encodeURIComponent(email)}/`,
          {
            method: 'GET',
          }
        );

        if (res.ok) {
          const blob = await res.blob();
          setQrCodeUrl(URL.createObjectURL(blob));
        } else {
          setError('Failed to fetch QR code. Please try again later.');
        }
      } catch (err) {
        console.error('Error fetching QR code:', err);
        setError('Error fetching QR code. Please check your network connection.');
      }
    };

    fetchQrCode();
  }, [email]);

  const handleRegister = async () => {
    const sanitizedOtp = DOMPurify.sanitize(otp.trim());

    if (sanitizedOtp.length !== 6 || isNaN(sanitizedOtp)) {
      alert('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      const res = await fetch(
        `https://secureshare-v4gy.onrender.com/validate-otp/${encodeURIComponent(email)}/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp: sanitizedOtp }),
        }
      );

      if (res.ok) {
        alert('Registration successful');
        navigate('/home');
      } else {
        alert('Incorrect OTP. Please try again.');
      }
    } catch (err) {
      console.error('Error validating OTP:', err);
      alert('Error validating OTP. Please check your network connection.');
    }
  };

  return (
    <div>
      <Navbar />

      <div className="auth-register-container">
        <h3>Scan this QR Code with Google Authenticator</h3>

        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code" />
        ) : (
          <p>{error || 'Loading QR Code...'}</p>
        )}

        <input
          type="text"
          placeholder="Enter OTP"
          maxLength="6"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <button onClick={handleRegister}>
          Complete Registration
        </button>
      </div>
    </div>
  );
};

export default AuthRegister;