import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    adminId: { type: String, required: true, unique: true },
    position: { type: String, required: true },
    password: { type: String, required: true },
}, { timestamps: true });



const Admin = mongoose.model("Admin", AdminSchema);
export default Admin;