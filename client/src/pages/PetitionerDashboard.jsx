import React, { useState } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const PetitionerDashboard = () => {
    const navigate = useNavigate();

    const [petitions, setPetitions] = useState([
        {
            id: "PET001",
            category: "Municipal",
            dateFiled: "2024-02-20",
            status: "Pending",
            expectedResolution: "2024-03-05",
            assignedOfficer: "Sarah Smith",
            department: "Public Works",
        },
        {
            id: "PET002",
            category: "Healthcare",
            dateFiled: "2024-02-18",
            status: "In Progress",
            expectedResolution: "2024-03-03",
            assignedOfficer: "Mike Johnson",
            department: "Health Services",
        },
    ]);

    return (
        <>
            <NavBar />
            <div className="container-fluid bg-light min-vh-100">
                {/* Navbar */}
                <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                    <div className="container">
                        <a className="navbar-brand fw-bold" href="#">Grievance Portal</a>
                        <div className="d-flex align-items-center">
                            <button
                                className="btn btn-primary d-flex align-items-center"
                                onClick={() => navigate("/submit-grievance")}
                            >
                                <Plus size={18} className="me-2" />
                                Submit New Petition
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Table */}
                <div className="container py-4">
                    <h1 className="h4 fw-bold">Your Petitions</h1>
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        {["Petition ID", "Category", "Date Filed", "Status", "Expected Resolution", "Assigned Officer", "Department"].map(
                                            (header) => (
                                                <th key={header} className="text-uppercase small">{header}</th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {petitions.map((petition) => (
                                        <tr key={petition.id}>
                                            <td className="text-primary fw-bold">{petition.id}</td>
                                            <td>{petition.category}</td>
                                            <td>{petition.dateFiled}</td>
                                            <td>
                                                <span
                                                    className={`badge bg-${petition.status === "Pending"
                                                        ? "warning"
                                                        : petition.status === "In Progress"
                                                            ? "info"
                                                            : "success"
                                                        }`}
                                                >
                                                    {petition.status}
                                                </span>
                                            </td>
                                            <td>{petition.expectedResolution}</td>
                                            <td>{petition.assignedOfficer}</td>
                                            <td>{petition.department}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default PetitionerDashboard;
