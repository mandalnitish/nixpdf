import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
              NixPDF
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium transition duration-300">Home</Link>
            <Link to="/features" className="text-gray-700 hover:text-purple-600 font-medium transition duration-300">Features</Link>
            <Link to="/about" className="text-gray-700 hover:text-purple-600 font-medium transition duration-300">About</Link>
            <Link to="/login" className="text-gray-700 hover:text-purple-600 font-medium transition duration-300">Login</Link>
            <Link 
              to="/signup" 
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-600 transition duration-300"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-700 focus:outline-none text-2xl"
            >
              {isOpen ? '✖️' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md px-4 pt-2 pb-4 space-y-2 animate-slide-down">
          <Link to="/" className="block text-gray-700 hover:text-purple-600 font-medium transition duration-300">Home</Link>
          <Link to="/features" className="block text-gray-700 hover:text-purple-600 font-medium transition duration-300">Features</Link>
          <Link to="/about" className="block text-gray-700 hover:text-purple-600 font-medium transition duration-300">About</Link>
          <Link to="/login" className="block text-gray-700 hover:text-purple-600 font-medium transition duration-300">Login</Link>
          <Link 
            to="/signup" 
            className="block bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-600 transition duration-300"
          >
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
