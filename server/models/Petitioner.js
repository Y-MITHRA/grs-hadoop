
import mongoose from "mongoose";

const PetitionerSchema = new mongoose.Schema(
{
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    password: { type: String, required: true }
});
const Petitioner = mongoose.model("Petitioner", PetitionerSchema);
export default Petitioner;