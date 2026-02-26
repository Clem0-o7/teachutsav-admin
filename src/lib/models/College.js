// @/lib/models/College.js
import mongoose, { Schema } from "mongoose";

const collegeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    city: String,
    state: String,
    // Email of the user/admin who created this college (for auditability)
    addedByUser: { type: String, default: null },
    approved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const College = mongoose.models.College || mongoose.model("College", collegeSchema);
export default College;
