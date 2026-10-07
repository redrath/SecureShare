import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchFileList, setSelectedUser, setSelectedFile, setSelectedPermission,setMessage, setError } from '../redux/fileSlice';
import api from "../api/api";
import Navbar from '../components/Navbar';

export default function FileShare() {
  const dispatch = useDispatch();
  
  const { users = [], files = [], selectedUser, selectedFile, selectedPermission, loading, error, message } = useSelector((state) => state.file);
  const email = useSelector((state) => state.auth.email);
  useEffect(() => {
    dispatch(fetchUsers(email));
    dispatch(fetchFileList(email));
  }, [dispatch,email]);

  const handleFileChange = (e) => {
    dispatch(setSelectedFile(e.target.value));
  };

  const handleUserChange = (e) => {
    dispatch(setSelectedUser(e.target.value));
  };
  
  const handlePermissionChange = (e) => {
    dispatch(setSelectedPermission(e.target.value));
  };

  const handleSubmit = async () => {
    dispatch(setMessage(null));
    dispatch(setError(null));
  
    if (selectedUser && selectedFile && selectedPermission) {
      const selection = {
        user: selectedUser.trim(),
        file: selectedFile.trim(),
        permission: selectedPermission.trim(),
        sender: email.trim(), // Include sender email
      };
  
      try {
        const response = await api.post("/file-share/", selection);
        console.log(response);
        alert("Data saved successfully!");
      } catch (err) {
        alert(err.response?.data?.detail || "Error saving data");
      }
    } else {
      alert("Please fill all fields before submitting.");
    }
  };
  


  return (
    <div><Navbar />
      <h2>File Sharing Panel</h2>

      {/* User Selection */}
    <div>
        <select onChange={handleUserChange} value={selectedUser}>
        <option value="">Select User</option>
          {users.length > 0 && users.map((user) => (
            <option key={user.email} value={user.email}>
              {user.email}
            </option>
          ))}
        </select>
    </div>


      {/* File Selection */}
      <div>
        {/* File selection dropdown */}
        <select onChange={handleFileChange} value={selectedFile}>
          <option value="">Select a file</option>
          {files.length > 0 && files.map((file) => (
            <option key={file.filename} value={file.filename}>
              {file.filename}
            </option>
          ))}
        </select>
      </div>

      {/* Permission Selection */}
<div>
  <select
    id="permission"
    value={selectedPermission}
    onChange={handlePermissionChange}
  >
    <option value="">Select Permission</option>
    <option value="View">View</option>
    <option value="Download">Download</option>
  </select>
</div>


      {/* Submit Button */}
      <div>
        <button onClick={handleSubmit}>
          Submit Selection
        </button>
      </div>

      {/* Display Messages */}
      {message && <p>{message}</p>}
      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}
    </div>
  );
}
