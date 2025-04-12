import React, { useState } from 'react';
import '../styles/Modal.css';

const EscalateModal = ({ isOpen, onClose, onSubmit, grievanceId }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(reason);
        setReason('');
    };

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="modal-title">Escalate Grievance</h2>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <label htmlFor="escalationReason" className="form-label">
                                Please provide a reason for escalating this grievance
                            </label>
                            <textarea
                                id="escalationReason"
                                className="modal-textarea"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter your reason for escalation..."
                                required
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-button cancel"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="modal-button submit"
                                disabled={!reason.trim()}
                            >
                                Submit Escalation
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default EscalateModal; 