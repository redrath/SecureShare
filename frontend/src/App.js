import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import Register from './components/Register';
import AuthRegister from './components/AuthRegister';
import Login from './components/Login';
import AuthLogin from './components/AuthLogin';
import RoleUser from './components/RoleUser';
import FileUpload from './components/FileUpload';
import FileDownload from './components/FileDownload';
import FileShare from './components/FileShare';
import SharedFile from './components/SharedFile';
import FileViewer from './components/FileViewer';
import Home from './components/Home';
import RoleGuest from './components/RoleGuest';
import E2EEFiles from './components/E2EEFiles';
const App = () => {
  
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/home" element={<Home/>} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth-register" element={<AuthRegister />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth-login" element={<AuthLogin />} />
          <Route path="/roleuser" element={<RoleUser/>} />
          <Route path="/roleguest" element={<RoleGuest/>} />
          <Route path="/fileupload" element={<FileUpload/>} />
          <Route path="/private-files" element={<E2EEFiles/>} />
          <Route path="/filedownload" element={<FileDownload/>} />
          <Route path="/fileshare" element={<FileShare/>} />
          <Route path="/SharedFile" element={<SharedFile/>} />
          <Route path="/fileview/:fileName" element={<FileViewer />} />
        </Routes>
      </Router>
    </Provider>
  );
};
 
export default App;