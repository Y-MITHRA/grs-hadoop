import React from 'react';

const AuthOption = ({ icon, iconColor, title, description, buttonText, onClick }) => {
  return (
    <div className="auth-option">
      <div className={`auth-icon text-${iconColor}`}>
        <i className={icon}></i>
      </div>
      <h3 className="auth-title">{title}</h3>
      <p className="auth-description">{description}</p>
      <button className="auth-btn" onClick={onClick}>
        {buttonText}
      </button>
    </div>
  );
};

export default AuthOption;
