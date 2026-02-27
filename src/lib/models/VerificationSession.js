import mongoose, { Schema } from "mongoose";

const verificationSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    passId: { type: Schema.Types.ObjectId, required: true },
    passType: { type: Number, required: true },

    // Snapshot of key user + college fields at verification time
    snapshotUser: {
      name: String,
      email: String,
      phoneNo: String,
      year: Number,
      department: String,
    },
    snapshotCollegeName: String,

    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    adminEmail: String,
    panelId: String,

    physicalSignatureCollected: { type: Boolean, default: false },
    detailsCorrectedOnPaper: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const VerificationSession =
  mongoose.models.VerificationSession ||
  mongoose.model("VerificationSession", verificationSessionSchema);

export default VerificationSession;

