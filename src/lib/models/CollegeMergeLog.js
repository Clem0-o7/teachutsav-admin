import mongoose, { Schema } from "mongoose";

const collegeMergeLogSchema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    collegeName: { type: String, required: true },
    normalizedKeys: [{ type: String, required: true }],
    modifiedCount: { type: Number, required: true },
    performedByEmail: { type: String, default: null },
    performedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CollegeMergeLog =
  mongoose.models.CollegeMergeLog ||
  mongoose.model("CollegeMergeLog", collegeMergeLogSchema);

export default CollegeMergeLog;

