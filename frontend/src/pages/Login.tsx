import React, { useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setToken, setUser } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await axios.post('http://localhost:8000/token', formData);
      setToken(res.data.access_token);
      
      // Fetch user details
      const userRes = await axios.get('http://localhost:8000/users/me/', {
        headers: { Authorization: `Bearer ${res.data.access_token}` }
      });
      setUser(userRes.data);
      
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-slate-900">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">ROL-Sagas Login</h2>
        <input 
          className="w-full border p-2 mb-4 rounded" 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <input 
          className="w-full border p-2 mb-6 rounded" 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Enter World
        </button>
      </form>
    </div>
  );
};
