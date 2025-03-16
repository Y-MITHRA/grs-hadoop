import React from 'react';
import NavBar from '../components/NavBar';

const About = () => {
  return (
    <div>
        <NavBar />
    <div className="container py-5">
      <h2 className="text-center">About Grievance Portal</h2>
      <p className="text-center text-secondary">
        The Grievance Redressal Portal is designed to simplify the process of filing and resolving complaints.
        It serves as a bridge between citizens and authorities, offering transparency and a streamlined way to address grievances.
      </p>
      <div className="mt-4">
        <h4>Features:</h4>
        <ul>
          <li>Easy grievance submission</li>
          <li>Track grievance status</li>
          <li>Real-time updates for both petitioners and officials</li>
          <li>Efficient grievance categorization and routing</li>
        </ul>
      </div>
    </div>
    </div>
  );
};

export default About;
