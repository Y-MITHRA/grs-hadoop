import React, { useState } from "react";
import { MdDelete, MdOutlineRestore, MdSearch } from "react-icons/md";
import { historicalData } from "../assets/data"; // Sample historical grievances
import Title from "../components/Title";
import Button from "../components/Button";
import ConfirmatioDialog from "../components/Dialogs";

// Sample departments
const DEPARTMENTS = ["All", "Health", "Education", "Transport", "Public Safety"];

const HistoricalDatabase = () => {
    const [openDialog, setOpenDialog] = useState(false);
    const [selected, setSelected] = useState(null);
    const [actionType, setActionType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("All");

    // Filter grievances based on department & search query
    const filteredGrievances = historicalData.filter((g) => {
        const matchesDepartment = selectedDepartment === "All" || g.department === selectedDepartment;
        const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.status.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesDepartment && matchesSearch;
    });

    const deleteClick = (id) => {
        setSelected(id);
        setActionType("delete");
        setOpenDialog(true);
    };

    const restoreClick = (id) => {
        setSelected(id);
        setActionType("restore");
        setOpenDialog(true);
    };

    return (
        <div className="container py-4">
            <Title title="Historical Database - Archived Grievances" />

            {/* Search & Filter Row */}
            <div className="row mb-3">
                <div className="col-md-6">
                    <div className="input-group">
                        <span className="input-group-text"><MdSearch /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search grievances..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-6">
                    <select className="form-select" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                        {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Display Filtered Grievances */}
            {filteredGrievances.length > 0 ? (
                <div className="card shadow-sm">
                    <div className="card-body">
                        <table className="table table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>Grievance</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Filed On</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGrievances.map((grievance) => (
                                    <tr key={grievance.id}>
                                        <td>{grievance.title}</td>
                                        <td>{grievance.department}</td>
                                        <td>
                                            <span className={`badge bg-${grievance.status === "Resolved" ? "success" : "warning"}`}>
                                                {grievance.status}
                                            </span>
                                        </td>
                                        <td>{new Date(grievance.dateFiled).toDateString()}</td>
                                        <td>
                                            <Button
                                                icon={<MdOutlineRestore className="text-success" />}
                                                className="btn btn-outline-success me-2"
                                                onClick={() => restoreClick(grievance.id)}
                                            />
                                            <Button
                                                icon={<MdDelete className="text-danger" />}
                                                className="btn btn-outline-danger"
                                                onClick={() => deleteClick(grievance.id)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="alert alert-warning text-center">No grievances found.</div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmatioDialog
                open={openDialog}
                setOpen={setOpenDialog}
                msg={actionType === "delete" ? "Are you sure you want to delete this grievance permanently?" : "Restore this grievance?"}
                onClick={() => console.log(`${actionType} grievance:`, selected)}
            />
        </div>
    );
};

export default HistoricalDatabase;
