import React, { useState } from 'react';
import NavBar from '../components/NavBar';
const Contact = () => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Your message has been sent!');
  };

  return (
    <div>
        <NavBar/>
    <div className="container py-5">
      <h2 className="text-center">Contact Us</h2>
      <p className="text-center text-secondary">
        Have questions or need help? Reach out to us using the form below.
      </p>
      
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-3">
          <label htmlFor="message" className="form-label">Message</label>
          <textarea
            id="message"
            className="form-control"
            rows="5"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">Send Message</button>
      </form>
    </div>
    </div>
  );
};

export default Contact;
