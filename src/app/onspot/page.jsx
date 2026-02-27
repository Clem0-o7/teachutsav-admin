"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ScanLine, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dynamic import with correct syntax
const QrReader = dynamic(
  async () => {
    const mod = await import("react-qr-reader");
    return mod.QrReader; // <- use the named export
  },
  { ssr: false }
);

const PASS_LABELS = {
  1: "Pass 1 – Offline Workshop And Events",
  2: "Pass 2 – Paper Presentation",
  3: "Pass 3 – Ideathon",
  4: "Pass 4 – Online Workshops",
};

function statusBadgeVariant(status) {
  if (status === "verified") return "default";
  if (status === "pending") return "outline";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function OnspotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [scanValue, setScanValue] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedPassId, setSelectedPassId] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNo: "",
    year: "",
    department: "",
    collegeId: "",
    newCollegeName: "",
    newCollegeCity: "",
    newCollegeState: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [checklist, setChecklist] = useState({
    physicalSignatureCollected: false,
    detailsCorrectedOnPaper: false,
  });
  const [completingVerification, setCompletingVerification] = useState(false);

  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    email: "",
    confirmEmail: "",
    phoneNo: "",
    year: "",
    department: "",
    passType: "1",
    paymentSource: "onspot-Cash",
    collegeId: "",
    newCollegeName: "",
    newCollegeCity: "",
    newCollegeState: "",
  });
  const [creatingManual, setCreatingManual] = useState(false);

  const [colleges, setColleges] = useState([]);
  const [profileCollegeSearch, setProfileCollegeSearch] = useState("");
  const [manualCollegeSearch, setManualCollegeSearch] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const currentPass = useMemo(() => {
    if (!userData || !Array.isArray(userData.passes)) return null;
    if (selectedPassId) {
      return userData.passes.find((p) => String(p._id) === String(selectedPassId)) || null;
    }
    return (
      userData.passes.find((p) => p.status === "verified") ||
      userData.passes.find((p) => p.status === "pending") ||
      userData.passes[0] ||
      null
    );
  }, [userData, selectedPassId]);

  const profileComplete = userData?.flags?.profileComplete;

  const profileCollegeMatches = useMemo(() => {
    const q = profileCollegeSearch.trim().toLowerCase();
    if (!q) return colleges.slice(0, 8);
    return colleges.filter((c) => (c.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [colleges, profileCollegeSearch]);

  const manualCollegeMatches = useMemo(() => {
    const q = manualCollegeSearch.trim().toLowerCase();
    if (!q) return colleges.slice(0, 8);
    return colleges.filter((c) => (c.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [colleges, manualCollegeSearch]);

  const canStartVerification =
    !!currentPass &&
    currentPass.status === "verified" &&
    !!profileComplete &&
    (!currentPass.gateStatus || currentPass.gateStatus === "not-checked");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      !["super-admin", "payments-admin"].includes(session?.user?.role)
    ) {
      router.push("/dashboard");
      toast.error("Access denied");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/college")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.colleges) setColleges(data.colleges);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status]);

  const resetState = () => {
    setUserData(null);
    setSelectedPassId(null);
    setProfileForm({
      name: "",
      email: "",
      phoneNo: "",
      year: "",
      department: "",
      collegeId: "",
      newCollegeName: "",
      newCollegeCity: "",
      newCollegeState: "",
    });
    setChecklist({
      physicalSignatureCollected: false,
      detailsCorrectedOnPaper: false,
    });
    // NOTE: intentionally NOT clearing scanValue here
  };

  const populateProfileForm = (payload) => {
    if (!payload?.user) return;
    const u = payload.user;
    setProfileForm((prev) => ({
      ...prev,
      name: u.name || "",
      email: u.email || "",
      phoneNo: u.phoneNo || "",
      year: u.year ? String(u.year) : "",
      department: u.department || "",
      collegeId: u.collegeId || "",
      newCollegeName: "",
      newCollegeCity: "",
      newCollegeState: "",
    }));
  };

  const handleScanSubmit = async (explicitValue) => {
    const raw = (typeof explicitValue === "string" ? explicitValue : scanValue).trim();

    if (!raw) {
      toast.error("Enter a QR / ID value");
      return;
    }

    let userId = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.userId) userId = parsed.userId;
    } catch {
      // plain ObjectId, use as-is
    }

    setLoadingUser(true);
    setManualMode(false);
    resetState();

    try {
      const res = await fetch(`/api/onspot/user/${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch user");
      setUserData(data);
      populateProfileForm(data);
      toast.success("User loaded");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load user");
    } finally {
      setLoadingUser(false);
    }
  };

  const handleProfileSave = async () => {
    if (!userData?.user?._id) return;
    const id = userData.user._id;

    const yearNum = parseInt(profileForm.year, 10);
    if (!yearNum || Number.isNaN(yearNum)) {
      toast.error("Enter a valid year");
      return;
    }
    if (!profileForm.collegeId && !profileForm.newCollegeName.trim()) {
      toast.error("Select a college or add a new one");
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phoneNo: profileForm.phoneNo,
        year: yearNum,
        department: profileForm.department,
      };
      if (profileForm.collegeId) {
        payload.collegeId = profileForm.collegeId;
      } else {
        payload.newCollege = {
          name: profileForm.newCollegeName,
          city: profileForm.newCollegeCity,
          state: profileForm.newCollegeState,
        };
      }

      const res = await fetch(`/api/onspot/user/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to update profile");

      await handleScanSubmit(scanValue);
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCompleteVerification = async () => {
    if (!currentPass?._id) return;
    if (!checklist.physicalSignatureCollected || !checklist.detailsCorrectedOnPaper) {
      toast.error("Complete all checklist items first");
      return;
    }

    setCompletingVerification(true);
    try {
      const res = await fetch(
        `/api/onspot/pass/${encodeURIComponent(currentPass._id)}/complete-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            physicalSignatureCollected: checklist.physicalSignatureCollected,
            detailsCorrectedOnPaper: checklist.detailsCorrectedOnPaper,
            panelId: "onspot-panel",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to complete verification");

      toast.success("Pass activated – allow entry");
      await handleScanSubmit(scanValue);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to complete verification");
    } finally {
      setCompletingVerification(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!currentPass?._id) return;
    setVerifyingPayment(true);
    try {
      const res = await fetch(
        `/api/onspot/pass/${encodeURIComponent(currentPass._id)}/verify-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIdType: "upi" }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to verify payment");
      toast.success("Payment marked as verified");
      await handleScanSubmit(scanValue);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to verify payment");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleCreateManualUser = async () => {
    if (manualForm.email.trim() !== manualForm.confirmEmail.trim()) {
      toast.error("Emails do not match");
      return;
    }
    const yearNum = parseInt(manualForm.year, 10);
    if (!yearNum || Number.isNaN(yearNum)) {
      toast.error("Enter a valid year");
      return;
    }
    if (!manualForm.collegeId && !manualForm.newCollegeName.trim()) {
      toast.error("Select a college or add a new one");
      return;
    }

    setCreatingManual(true);
    try {
      const payload = {
        name: manualForm.name,
        email: manualForm.email,
        phoneNo: manualForm.phoneNo,
        year: yearNum,
        department: manualForm.department,
        passType: parseInt(manualForm.passType, 10),
        paymentSource: manualForm.paymentSource,
      };
      if (manualForm.collegeId) {
        payload.collegeId = manualForm.collegeId;
      } else {
        payload.newCollege = {
          name: manualForm.newCollegeName,
          city: manualForm.newCollegeCity,
          state: manualForm.newCollegeState,
        };
      }

      const res = await fetch("/api/onspot/manual-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to create manual user");

      toast.success("Manual user created and pass email triggered");
      setManualForm({
        name: "",
        email: "",
        confirmEmail: "",
        phoneNo: "",
        year: "",
        department: "",
        passType: "1",
        paymentSource: "onspot-Cash",
        collegeId: "",
        newCollegeName: "",
        newCollegeCity: "",
        newCollegeState: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create manual user");
    } finally {
      setCreatingManual(false);
    }
  };

  if (status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-72 w-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-col gap-6 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">On-spot Verification</h1>
              <p className="text-muted-foreground">
                Scan, verify, and activate passes with physical accountability.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={manualMode ? "outline" : "secondary"}
                onClick={() => {
                  setManualMode(false);
                  resetState();
                }}
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Scan & Verify
              </Button>
              <Button
                type="button"
                variant={manualMode ? "default" : "outline"}
                onClick={() => {
                  setManualMode(true);
                  resetState();
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register Walk-in
              </Button>
            </div>
          </div>

          {!manualMode && (
            <Card>
              <CardHeader>
                <CardTitle>Scan / Lookup Pass</CardTitle>
                <CardDescription>
                  Scan a QR code or paste the QR payload / Mongo ObjectId to load a user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" onClick={() => setCameraOn(!cameraOn)}>
                    {cameraOn ? "Stop Camera" : "Open Camera"}
                  </Button>
                  <Input
                    placeholder="Scan QR or paste ID / JSON payload"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleScanSubmit(scanValue);
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleScanSubmit(scanValue)}
                    disabled={loadingUser}
                  >
                    <ScanLine className="w-4 h-4 mr-2" />
                    {loadingUser ? "Loading…" : "Fetch User"}
                  </Button>
                </div>

                {cameraOn && (
                  <div className="w-full h-64 border mt-2 overflow-hidden rounded-md">
                    <QrReader
                      constraints={{ facingMode: "environment" }}
                      onResult={(result) => {
                        if (result) {
                          const text = result?.text;
                          setScanValue(text);
                          handleScanSubmit(text);
                          setCameraOn(false);
                        }
                      }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                )}

                {userData && (
                  <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
                    {/* Left column */}
                    <div className="space-y-3">
                      <Card className="border border-border">
                        <CardHeader>
                          <CardTitle className="text-base">User Details</CardTitle>
                          <CardDescription className="text-xs">
                            Cross-check visually and correct any mismatches.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <p className="font-semibold">{userData.user.name}</p>
                            <p className="text-muted-foreground text-xs">{userData.user.email}</p>
                            <p className="text-muted-foreground text-xs">{userData.user.phoneNo}</p>
                          </div>
                          <div className="text-xs">
                            <p>
                              <span className="font-medium">Year:</span> {userData.user.year || "—"}
                            </p>
                            <p>
                              <span className="font-medium">Department:</span>{" "}
                              {userData.user.department || "—"}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>
                                {userData.collegeResolved
                                  ? `${userData.collegeResolved.name}${
                                      userData.collegeResolved.city
                                        ? `, ${userData.collegeResolved.city}`
                                        : ""
                                    }${
                                      userData.collegeResolved.state
                                        ? `, ${userData.collegeResolved.state}`
                                        : ""
                                    }`
                                  : userData.user.college || "Unknown / Unmapped"}
                              </span>
                            </p>
                          </div>
                          <div className="mt-2">
                            <Badge
                              variant={profileComplete ? "default" : "outline"}
                              className={cn(
                                "text-xs",
                                !profileComplete && "border-amber-500 text-amber-700"
                              )}
                            >
                              {profileComplete ? "Profile Complete" : "Profile Incomplete"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Edit Profile</CardTitle>
                          <CardDescription className="text-xs">
                            Update details to match physical form & college records.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <Input
                            placeholder="Name"
                            value={profileForm.name}
                            onChange={(e) =>
                              setProfileForm((f) => ({ ...f, name: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Email"
                            value={profileForm.email}
                            onChange={(e) =>
                              setProfileForm((f) => ({ ...f, email: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Phone"
                            value={profileForm.phoneNo}
                            onChange={(e) =>
                              setProfileForm((f) => ({ ...f, phoneNo: e.target.value }))
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Year"
                              value={profileForm.year}
                              onChange={(e) =>
                                setProfileForm((f) => ({ ...f, year: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="Department"
                              value={profileForm.department}
                              onChange={(e) =>
                                setProfileForm((f) => ({ ...f, department: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              College (search or add new)
                            </p>
                            {profileForm.collegeId ? (
                              <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                                <span className="flex-1 truncate">
                                  {colleges.find(
                                    (c) => String(c._id) === String(profileForm.collegeId)
                                  )?.name ||
                                    userData?.collegeResolved?.name ||
                                    userData?.user?.college ||
                                    "Selected"}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    setProfileForm((f) => ({ ...f, collegeId: "" }));
                                    setProfileCollegeSearch("");
                                  }}
                                >
                                  Change
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Input
                                  placeholder="Type to search college..."
                                  value={profileCollegeSearch}
                                  onChange={(e) => setProfileCollegeSearch(e.target.value)}
                                />
                                {profileCollegeMatches.length > 0 && (
                                  <ul className="border border-border rounded-md max-h-32 overflow-y-auto">
                                    {profileCollegeMatches.map((c) => (
                                      <li key={c._id}>
                                        <button
                                          type="button"
                                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted"
                                          onClick={() => {
                                            setProfileForm((f) => ({
                                              ...f,
                                              collegeId: c._id,
                                              newCollegeName: "",
                                              newCollegeCity: "",
                                              newCollegeState: "",
                                            }));
                                            setProfileCollegeSearch(c.name || "");
                                          }}
                                        >
                                          {c.name}
                                          {(c.city || c.state) && (
                                            <span className="text-muted-foreground ml-1">
                                              — {[c.city, c.state].filter(Boolean).join(", ")}
                                            </span>
                                          )}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="space-y-1 pt-1">
                                  <p className="text-[11px] text-muted-foreground">
                                    Or add new college (on-spot approved)
                                  </p>
                                  <Input
                                    placeholder="New college name"
                                    value={profileForm.newCollegeName}
                                    onChange={(e) =>
                                      setProfileForm((f) => ({
                                        ...f,
                                        newCollegeName: e.target.value,
                                      }))
                                    }
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="City"
                                      value={profileForm.newCollegeCity}
                                      onChange={(e) =>
                                        setProfileForm((f) => ({
                                          ...f,
                                          newCollegeCity: e.target.value,
                                        }))
                                      }
                                    />
                                    <Input
                                      placeholder="State"
                                      value={profileForm.newCollegeState}
                                      onChange={(e) =>
                                        setProfileForm((f) => ({
                                          ...f,
                                          newCollegeState: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full mt-2"
                            onClick={handleProfileSave}
                            disabled={savingProfile}
                          >
                            {savingProfile ? "Saving…" : "Save Profile & Mark Complete"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Passes</CardTitle>
                          <CardDescription className="text-xs">
                            Select the pass being verified at this gate.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          {userData.passes.length === 0 ? (
                            <p className="text-muted-foreground">No passes found for this user.</p>
                          ) : (
                            userData.passes.map((p) => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => setSelectedPassId(p._id)}
                                className={cn(
                                  "w-full text-left rounded-md border px-3 py-2 flex items-center justify-between gap-2",
                                  String(currentPass?._id) === String(p._id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted"
                                )}
                              >
                                <div>
                                  <p className="font-medium">
                                    {PASS_LABELS[p.passType] || `Pass ${p.passType}`}
                                  </p>
                                  <p className="text-muted-foreground text-[11px]">
                                    Txn: {p.transactionNumber}
                                  </p>
                                </div>
                                <Badge size="sm" variant={statusBadgeVariant(p.status)}>
                                  {p.status}
                                </Badge>
                              </button>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Verification Session</CardTitle>
                          <CardDescription className="text-xs">
                            Complete all physical checks before activating the pass.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                          {!currentPass && (
                            <p className="text-muted-foreground">Select a pass to continue.</p>
                          )}
                          {currentPass && (
                            <>
                              <div className="space-y-1">
                                <p className="font-semibold">
                                  {PASS_LABELS[currentPass.passType] || `Pass ${currentPass.passType}`}
                                </p>
                                <p className="text-muted-foreground">
                                  Payment status:{" "}
                                  <span className="font-medium">{currentPass.status}</span>
                                </p>
                                <p className="text-muted-foreground">
                                  Gate status:{" "}
                                  <span className="font-medium">
                                    {currentPass.gateStatus || "not-checked"}
                                  </span>
                                </p>
                              </div>

                              {currentPass.status !== "verified" && (
                                <p className="text-red-600 font-medium">
                                  Payment is not verified. Do not admit user until payment is
                                  verified by payments team.
                                </p>
                              )}

                              {currentPass.status === "pending" && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 mb-2">
                                  <p className="text-amber-800 dark:text-amber-200 text-xs font-medium mb-2">
                                    Payment pending. Verify payment first, then complete physical checks.
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-400 text-amber-800 hover:bg-amber-100"
                                    onClick={handleVerifyPayment}
                                    disabled={verifyingPayment}
                                  >
                                    {verifyingPayment ? "Verifying…" : "Mark payment as verified"}
                                  </Button>
                                </div>
                              )}

                              {!profileComplete && (
                                <p className="text-amber-700 font-medium">
                                  Profile incomplete. Fill all required fields before verifying.
                                </p>
                              )}

                              <div className="space-y-2 mt-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="chk-signature"
                                    checked={checklist.physicalSignatureCollected}
                                    onCheckedChange={(v) =>
                                      setChecklist((c) => ({
                                        ...c,
                                        physicalSignatureCollected: Boolean(v),
                                      }))
                                    }
                                  />
                                  <label
                                    htmlFor="chk-signature"
                                    className="text-xs leading-tight cursor-pointer"
                                  >
                                    Physical signature collected on roster sheet
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="chk-details"
                                    checked={checklist.detailsCorrectedOnPaper}
                                    onCheckedChange={(v) =>
                                      setChecklist((c) => ({
                                        ...c,
                                        detailsCorrectedOnPaper: Boolean(v),
                                      }))
                                    }
                                  />
                                  <label
                                    htmlFor="chk-details"
                                    className="text-xs leading-tight cursor-pointer"
                                  >
                                    Details corrected on paper & confirmed with user
                                  </label>
                                </div>
                              </div>

                              <Button
                                type="button"
                                className="w-full mt-3"
                                onClick={handleCompleteVerification}
                                disabled={
                                  !canStartVerification ||
                                  completingVerification ||
                                  !checklist.physicalSignatureCollected ||
                                  !checklist.detailsCorrectedOnPaper
                                }
                              >
                                {completingVerification
                                  ? "Completing…"
                                  : "End Verification Session & Activate Pass"}
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {manualMode && (
            <Card>
              <CardHeader>
                <CardTitle>Register Walk-in (On-spot)</CardTitle>
                <CardDescription>
                  High-risk flow for users without prior registration. Follow paper + cash +
                  signature process strictly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-amber-900">
                  <p className="font-semibold text-xs mb-1">Warning</p>
                  <p>
                    Use this flow only after collecting cash / on-spot UPI, filling the paper
                    form, and taking a physical signature. Double-check the email address with
                    the user before proceeding.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Input
                      placeholder="Name"
                      value={manualForm.name}
                      onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Email"
                      value={manualForm.email}
                      onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))}
                    />
                    <Input
                      placeholder="Confirm Email"
                      value={manualForm.confirmEmail}
                      onChange={(e) =>
                        setManualForm((f) => ({ ...f, confirmEmail: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Phone"
                      value={manualForm.phoneNo}
                      onChange={(e) =>
                        setManualForm((f) => ({ ...f, phoneNo: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Year"
                        value={manualForm.year}
                        onChange={(e) =>
                          setManualForm((f) => ({ ...f, year: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Department"
                        value={manualForm.department}
                        onChange={(e) =>
                          setManualForm((f) => ({ ...f, department: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Select
                        value={manualForm.passType}
                        onValueChange={(v) => setManualForm((f) => ({ ...f, passType: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Pass type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{PASS_LABELS[1]}</SelectItem>
                          <SelectItem value="2">{PASS_LABELS[2]}</SelectItem>
                          <SelectItem value="3">{PASS_LABELS[3]}</SelectItem>
                          <SelectItem value="4">{PASS_LABELS[4]}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={manualForm.paymentSource}
                        onValueChange={(v) =>
                          setManualForm((f) => ({ ...f, paymentSource: v }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Payment source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="onspot-Cash">On-spot Cash</SelectItem>
                          <SelectItem value="onspot-UPI">On-spot UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        College (search or add new)
                      </p>
                      {manualForm.collegeId ? (
                        <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                          <span className="flex-1 truncate">
                            {colleges.find(
                              (c) => String(c._id) === String(manualForm.collegeId)
                            )?.name || "Selected"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setManualForm((f) => ({ ...f, collegeId: "" }));
                              setManualCollegeSearch("");
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Type to search college..."
                            value={manualCollegeSearch}
                            onChange={(e) => setManualCollegeSearch(e.target.value)}
                          />
                          {manualCollegeMatches.length > 0 && (
                            <ul className="border border-border rounded-md max-h-32 overflow-y-auto">
                              {manualCollegeMatches.map((c) => (
                                <li key={c._id}>
                                  <button
                                    type="button"
                                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted"
                                    onClick={() => {
                                      setManualForm((f) => ({
                                        ...f,
                                        collegeId: c._id,
                                        newCollegeName: "",
                                        newCollegeCity: "",
                                        newCollegeState: "",
                                      }));
                                      setManualCollegeSearch(c.name || "");
                                    }}
                                  >
                                    {c.name}
                                    {(c.city || c.state) && (
                                      <span className="text-muted-foreground ml-1">
                                        — {[c.city, c.state].filter(Boolean).join(", ")}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="space-y-1 pt-1">
                            <p className="text-[11px] text-muted-foreground">
                              Or add new college (on-spot approved)
                            </p>
                            <Input
                              placeholder="New college name"
                              value={manualForm.newCollegeName}
                              onChange={(e) =>
                                setManualForm((f) => ({
                                  ...f,
                                  newCollegeName: e.target.value,
                                }))
                              }
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="City"
                                value={manualForm.newCollegeCity}
                                onChange={(e) =>
                                  setManualForm((f) => ({
                                    ...f,
                                    newCollegeCity: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                placeholder="State"
                                value={manualForm.newCollegeState}
                                onChange={(e) =>
                                  setManualForm((f) => ({
                                    ...f,
                                    newCollegeState: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleCreateManualUser}
                  disabled={creatingManual}
                >
                  {creatingManual ? "Creating & Emailing Pass…" : "Create User & Email Pass"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}