import React, { useState } from 'react';
import { Bell, Menu, X, ChevronRight, User, FileText, BarChart2, HelpCircle } from 'lucide-react';
import image from '../assets/image.jpg';
import Footer from '../shared/Footer';
import NavBar from '../components/NavBar';
import { useNavigate } from 'react-router-dom';

const GrievancePortal = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();
  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bar */}
      <NavBar/>
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4 mb-md-0">
              <h1 className="display-5 fw-bold mb-3">
                Submit and Track Your Grievances Easily
              </h1>
              <p className="lead mb-4">
                A simple, efficient platform to voice your concerns and get them resolved quickly.
              </p>
              <div className="d-grid gap-2 d-sm-flex">
                <button className="btn btn-warning px-4 py-2 me-md-2 d-flex align-items-center justify-content-center">
                  Submit Grievance <ChevronRight className="ms-2" size={18} />
                </button>
                <button className="btn btn-outline-light px-4 py-2">
                  Track Status
                </button>
              </div>
            </div>
            <div className="col-md-6 text-center">
              <img src={image} alt="Grievance Illustration" className="img-fluid rounded shadow" style={{ maxWidth: '700px' }} />
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h2 className="text-center mb-5 fw-bold">How Our Grievance System Works</h2>
          
          <div className="row g-4">
            {/* Feature 1 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-center mb-3">
                    <div className="bg-primary d-flex align-items-center justify-content-center rounded-circle" style={{ width: '50px', height: '50px' }}>
                      <FileText size={24} className="text-white" />
                    </div>
                  </div>
                  <h3 className="card-title text-center h5 mb-3">Submit Your Grievance</h3>
                  <p className="card-text text-muted">Fill out a simple form with your details and describe your issue. Attach supporting documents if needed.</p>
                </div>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-center mb-3">
                    <div className="bg-success d-flex align-items-center justify-content-center rounded-circle" style={{ width: '50px', height: '50px' }}>
                      <User size={24} className="text-white" />
                    </div>
                  </div>
                  <h3 className="card-title text-center h5 mb-3">Get Assigned to an Officer</h3>
                  <p className="card-text text-muted">Your grievance will be reviewed and assigned to the appropriate department for resolution.</p>
                </div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-center mb-3">
                    <div className="bg-warning d-flex align-items-center justify-content-center rounded-circle" style={{ width: '50px', height: '50px' }}>
                      <BarChart2 size={24} className="text-white" />
                    </div>
                  </div>
                  <h3 className="card-title text-center h5 mb-3">Track Your Status</h3>
                  <p className="card-text text-muted">Get real-time updates on your grievance status and receive notifications on progress.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Statistics Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-3 col-6 mb-4">
              <h3 className="display-5 fw-bold text-primary mb-2">95%</h3>
              <p className="text-muted">Resolution Rate</p>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <h3 className="display-5 fw-bold text-primary mb-2">48hrs</h3>
              <p className="text-muted">Average Response Time</p>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <h3 className="display-5 fw-bold text-primary mb-2">10,000+</h3>
              <p className="text-muted">Grievances Handled</p>
            </div>
            <div className="col-md-3 col-6 mb-4">
              <h3 className="display-5 fw-bold text-primary mb-2">4.8/5</h3>
              <p className="text-muted">User Satisfaction</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQs Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h2 className="text-center mb-5 fw-bold">Frequently Asked Questions</h2>
          
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="accordion" id="faqAccordion">
                <div className="accordion-item border mb-3 rounded">
                  <h2 className="accordion-header" id="headingOne">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                      How long does it take to resolve a grievance?
                    </button>
                  </h2>
                  <div id="collapseOne" className="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#faqAccordion">
                    <div className="accordion-body text-muted">
                      Most grievances are resolved within 3-5 working days, depending on the complexity of the issue.
                    </div>
                  </div>
                </div>
                
                <div className="accordion-item border mb-3 rounded">
                  <h2 className="accordion-header" id="headingTwo">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                      Can I submit anonymous grievances?
                    </button>
                  </h2>
                  <div id="collapseTwo" className="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#faqAccordion">
                    <div className="accordion-body text-muted">
                      Yes, we have an option for anonymous submission for sensitive matters, though providing contact details helps in resolution.
                    </div>
                  </div>
                </div>
                
                <div className="accordion-item border mb-3 rounded">
                  <h2 className="accordion-header" id="headingThree">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                      What if I'm not satisfied with the resolution?
                    </button>
                  </h2>
                  <div id="collapseThree" className="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#faqAccordion">
                    <div className="accordion-body text-muted">
                      You can request an escalation to higher authorities if you're not satisfied with the initial resolution.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
      {/* Footer */}
      
    </div>
  );
};

export default GrievancePortal;