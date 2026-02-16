'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface HeaderProps {
  title: string;
  onTitleChange?: (title: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onTitleChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const { user, logout, isAuthenticated } = useAuthStore();

  const handleTitleClick = () => {
    if (onTitleChange) {
      setEditValue(title);
      setIsEditing(true);
    }
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== title && onTitleChange) {
      onTitleChange(editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
      {/* Left: Logo and title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-8 h-8 text-blue-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18l6.9 3.45L12 11.09l-6.9-3.46L12 4.18zM4 16.54V9.09l7 3.5v7.36l-7-3.41zm9 3.41v-7.36l7-3.5v7.45l-7 3.41z" />
          </svg>
          <span className="font-semibold text-gray-800">Neck Diagrams</span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Editable title */}
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            className="text-lg font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded border border-blue-300 outline-none"
            autoFocus
          />
        ) : (
          <h1
            onClick={handleTitleClick}
            className={`text-lg font-medium text-gray-700 ${
              onTitleChange ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : ''
            }`}
          >
            {title}
          </h1>
        )}
      </div>

      {/* Center: Date */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-gray-500">
        {today}
      </div>

      {/* Right: User menu */}
      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </>
        ) : (
          <a
            href="/auth/login"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Log in
          </a>
        )}
      </div>
    </header>
  );
};

export default Header;
