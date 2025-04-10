import React from "react";

const Button = ({ children, onClick, className, type = "button" }) => {
    return (
        <button type={type} className={`btn ${className}`} onClick={onClick}>
            {children}
        </button>
    );
};

export default Button;
