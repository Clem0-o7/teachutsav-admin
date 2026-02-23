"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  ExternalLink,
  User,
  CreditCard,
  Clock,
  AlertTriangle,
  Download,
} from "lucide-react";

const PASS_LABELS = {
  1: "Pass 1 – Offline",
  2: "Pass 2 – Paper",
  3: "Pass 3 – Idea",
  4: "Pass 4 – Online",
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  icon: Clock,       className: "text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30" },
  verified: { label: "Verified", icon: CheckCircle, className: "text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30" },
  rejected: { label: "Rejected", icon: XCircle,     className: "text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();

  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPass, setFilterPass]     = useState("all");
  const [filterPaymentType, setFilterPaymentType] = useState("all");
  const [filterDuplicates, setFilterDuplicates] = useState("all");
  const [sortBy, setSortBy]             = useState("newest");

  const [screenshotDialog, setScreenshotDialog] = useState({ open: false, payment: null });
  const [verifyDialog, setVerifyDialog]         = useState({ open: false, payment: null });
  const [verifyLoading, setVerifyLoading]       = useState(false);
  const [verifyPaymentIdType, setVerifyPaymentIdType] = useState("");
  const [editedTransactionId, setEditedTransactionId] = useState("");
  const [rejectDialog, setRejectDialog]         = useState({ open: false, payment: null });
  const [rejectionReason, setRejectionReason]   = useState("");
  const [rejectLoading, setRejectLoading]       = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/payments");
      const data = await res.json();
      if (data.success) setPayments(data.payments);
      else toast.error("Failed to load payments");
    } catch { toast.error("Failed to load payments"); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, []);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (filterStatus !== "all") list = list.filter(p => p.status === filterStatus);
    if (filterPass  !== "all") list = list.filter(p => String(p.passType) === filterPass);
    if (filterPaymentType !== "all") list = list.filter(p => p.paymentIdType === filterPaymentType);
    if (filterDuplicates !== "all") {
      if (filterDuplicates === "duplicates") {
        list = list.filter(p => p.isDuplicate);
      } else if (filterDuplicates === "unique") {
        list = list.filter(p => !p.isDuplicate);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.userName.toLowerCase().includes(q) ||
        p.userEmail.toLowerCase().includes(q) ||
        p.transactionNumber.toLowerCase().includes(q) ||
        (p.college || "").toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "newest":    list.sort((a,b) => new Date(b.submittedDate) - new Date(a.submittedDate)); break;
      case "oldest":    list.sort((a,b) => new Date(a.submittedDate) - new Date(b.submittedDate)); break;
      case "name-asc":  list.sort((a,b) => a.userName.localeCompare(b.userName)); break;
      case "name-desc": list.sort((a,b) => b.userName.localeCompare(a.userName)); break;
      case "pass":      list.sort((a,b) => a.passType - b.passType); break;
    }
    return list;
  }, [payments, filterStatus, filterPass, filterPaymentType, filterDuplicates, search, sortBy]);

  const stats = useMemo(() => ({
    total:    payments.length,
    pending:  payments.filter(p => p.status === "pending").length,
    verified: payments.filter(p => p.status === "verified").length,
    rejected: payments.filter(p => p.status === "rejected").length,
    duplicates: payments.filter(p => p.isDuplicate).length,
  }), [payments]);

  const handleVerify = async () => {
    if (!verifyDialog.payment || !verifyPaymentIdType) {
      toast.error("Please select a payment ID type");
      return;
    }

    const finalTransactionId = editedTransactionId.trim() || verifyDialog.payment.transactionNumber;

    // Check for special characters in final transaction ID
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(finalTransactionId);
    if (hasSpecialChars) {
      const confirmed = window.confirm(
        `Warning: Transaction ID "${finalTransactionId}" contains special characters. This may affect duplicate detection. Continue with verification?`
      );
      if (!confirmed) return;
    }

    setVerifyLoading(true);
    try {
      const res  = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: verifyDialog.payment.userId, 
          passId: verifyDialog.payment.passId, 
          action: "verify",
          paymentIdType: verifyPaymentIdType,
          editedTransactionId: finalTransactionId !== verifyDialog.payment.transactionNumber ? finalTransactionId : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.emailWarning) {
          toast.warning(`Payment verified, but email failed: ${data.emailWarning}`);
        } else {
          toast.success("Payment verified — confirmation email sent");
        }
        setVerifyDialog({ open: false, payment: null });
        setVerifyPaymentIdType("");
        setEditedTransactionId("");
        fetchPayments();
      } else toast.error(data.message || "Verification failed");
    } catch { toast.error("Verification failed"); }
    finally  { setVerifyLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectDialog.payment || !rejectionReason.trim()) return;
    setRejectLoading(true);
    try {
      const res  = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: rejectDialog.payment.userId, passId: rejectDialog.payment.passId, action: "reject", rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.emailWarning) {
          toast.warning(`Payment rejected, but email failed: ${data.emailWarning}`);
        } else {
          toast.success("Payment rejected — rejection email sent");
        }
        setRejectDialog({ open: false, payment: null });
        setRejectionReason("");
        fetchPayments();
      } else toast.error(data.message || "Rejection failed");
    } catch { toast.error("Rejection failed"); }
    finally  { setRejectLoading(false); }
  };

  // Download functionality using API endpoint
  const [downloadLoading, setDownloadLoading] = useState({});

  const downloadVerifiedPassPayments = async (passType) => {
    const verifiedPayments = payments.filter(p => 
      p.status === 'verified' && 
      p.passType === passType
    );
    
    if (verifiedPayments.length === 0) {
      toast.info(`No verified payments found for ${PASS_LABELS[passType]}`);
      return;
    }

    setDownloadLoading(prev => ({ ...prev, [`pass${passType}`]: true }));

    try {
      const response = await fetch(`/api/payments/download?passType=${passType}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `${PASS_LABELS[passType].replace(/[^a-zA-Z0-9]/g, '_')}_Verified_Payments.csv`;
      
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${verifiedPayments.length} verified payments for ${PASS_LABELS[passType]}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${PASS_LABELS[passType]} payments`);
    } finally {
      setDownloadLoading(prev => ({ ...prev, [`pass${passType}`]: false }));
    }
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Payment Verification</h1>
              <p className="text-muted-foreground text-sm mt-1">Review, verify or reject participant pass payments</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total",    value: stats.total,    icon: CreditCard,     cls: "text-foreground" },
              { label: "Pending",  value: stats.pending,  icon: Clock,          cls: "text-yellow-600" },
              { label: "Verified", value: stats.verified, icon: CheckCircle,    cls: "text-green-600" },
              { label: "Rejected", value: stats.rejected, icon: XCircle,        cls: "text-red-600" },
              { label: "Duplicates", value: stats.duplicates, icon: AlertTriangle, cls: "text-orange-600" },
            ].map(({ label, value, icon: Icon, cls }) => (
              <Card key={label} className="shadow-none">
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className={`w-8 h-8 ${cls}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{loading ? "–" : value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search name, email, transaction…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
                </div>
                <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                  <TabsList className="h-9">
                    <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs px-3">Pending</TabsTrigger>
                    <TabsTrigger value="verified" className="text-xs px-3">Verified</TabsTrigger>
                    <TabsTrigger value="rejected" className="text-xs px-3">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Select value={filterPass} onValueChange={setFilterPass}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Passes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Passes</SelectItem>
                    <SelectItem value="1">Pass 1 – Offline Workshop And Events</SelectItem>
                    <SelectItem value="2">Pass 2 – Paper Presentation</SelectItem>
                    <SelectItem value="3">Pass 3 – Ideathon</SelectItem>
                    <SelectItem value="4">Pass 4 – Online Workshops</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Payment ID Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="upi">UPI Transaction ID</SelectItem>
                    <SelectItem value="eazypay">Eazy Pay Reference</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDuplicates} onValueChange={setFilterDuplicates}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Duplicates" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="unique">Unique Only</SelectItem>
                    <SelectItem value="duplicates">Duplicates Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A → Z</SelectItem>
                    <SelectItem value="name-desc">Name Z → A</SelectItem>
                    <SelectItem value="pass">Pass Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {payments.length} payments</p>
            </CardContent>
          </Card>

          {/* Download Verified Payments */}
          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Download Verified Payments</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(PASS_LABELS).map(([passType, label]) => {
                    const verifiedCount = payments.filter(p => p.status === 'verified' && p.passType === parseInt(passType)).length;
                    const isLoading = downloadLoading[`pass${passType}`];
                    return (
                      <Button
                        key={passType}
                        variant="outline"
                        size="sm"
                        onClick={() => downloadVerifiedPassPayments(parseInt(passType))}
                        disabled={verifiedCount === 0 || isLoading}
                        className="gap-2 text-xs h-9 px-3"
                      >
                        <Download className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        <div className="flex flex-col items-start leading-none">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground">
                            {isLoading ? 'Downloading...' : `(${verifiedCount} verified)`}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="shadow-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Pass</TableHead>
                  <TableHead>Payment ID Type</TableHead>
                  <TableHead>Transaction No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : filtered.map(payment => (
                  <TableRow key={payment.passId} className={payment.isDuplicate ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{payment.userName}</p>
                          <p className="text-xs text-muted-foreground">{payment.userEmail}</p>
                          {payment.college && <p className="text-xs text-muted-foreground">{payment.college}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-medium">{PASS_LABELS[payment.passType]}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {payment.paymentIdType ? (
                          <Badge variant="outline" className="text-xs">
                            {payment.paymentIdType === "upi" ? "UPI" : "Eazy Pay"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not Set
                          </Badge>
                        )}
                        {payment.isDuplicate && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Duplicate
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{payment.transactionNumber}</code>
                        {payment.hasSpecialCharacters && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Special chars
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <StatusBadge status={payment.status} />
                        {payment.status === "rejected" && payment.rejectionReason && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[160px]" title={payment.rejectionReason}>{payment.rejectionReason}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">
                        {payment.submittedDate ? new Date(payment.submittedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {payment.verifiedBy ? (
                        <div>
                          <p className="text-xs font-medium">{payment.verifiedBy}</p>
                          <p className="text-xs text-muted-foreground">{payment.verifiedDate ? new Date(payment.verifiedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs" onClick={() => setScreenshotDialog({ open: true, payment })} title="View proof">
                          <Eye className="w-3.5 h-3.5" /> Proof
                        </Button>
                        {payment.status !== "verified" && (
                          <Button size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => setVerifyDialog({ open: true, payment })}>
                            <CheckCircle className="w-3.5 h-3.5" /> Verify
                          </Button>
                        )}
                        {payment.status !== "rejected" && (
                          <Button size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => { 
                            setRejectDialog({ open: true, payment }); 
                            setRejectionReason(payment.isDuplicate ? "Duplicate transaction ID detected. This transaction number has already been used by another participant." : "");
                          }}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </SidebarInset>

      {/* ── Screenshot Dialog ───────────────────────────────────────────── */}
      <Dialog open={screenshotDialog.open} onOpenChange={open => !open && setScreenshotDialog({ open: false, payment: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              {screenshotDialog.payment && (
                <span>
                  <strong>{screenshotDialog.payment.userName}</strong> · {PASS_LABELS[screenshotDialog.payment.passType]} · 
                  {screenshotDialog.payment.paymentIdType ? 
                    (screenshotDialog.payment.paymentIdType === "upi" ? " UPI ID" : " Eazy Pay Reference") : 
                    " Payment Type: Not Set"
                  }: <code>{screenshotDialog.payment.transactionNumber}</code>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {screenshotDialog.payment && (
            <div className="flex flex-wrap gap-2 mb-4">
              {screenshotDialog.payment.isDuplicate && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Duplicate Transaction ID
                </Badge>
              )}
              {screenshotDialog.payment.hasSpecialCharacters && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Special Characters
                </Badge>
              )}
            </div>
          )}
          {screenshotDialog.payment?.screenshotUrl ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center min-h-[300px] max-h-[60vh]">
                <img src={screenshotDialog.payment.screenshotUrl} alt="Payment screenshot" className="max-w-full max-h-[60vh] object-contain" />
              </div>
              <a href={screenshotDialog.payment.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Open in new tab
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
              <AlertTriangle className="w-5 h-5" /><span className="text-sm">No screenshot available</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            {screenshotDialog.payment?.status !== "verified" && (
              <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => { setVerifyDialog({ open: true, payment: screenshotDialog.payment }); setScreenshotDialog({ open: false, payment: null }); }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Verify This Payment
              </Button>
            )}
            {screenshotDialog.payment?.status !== "rejected" && (
              <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => { 
                setRejectDialog({ open: true, payment: screenshotDialog.payment }); 
                setRejectionReason(screenshotDialog.payment.isDuplicate ? "Duplicate transaction ID detected. This transaction number has already been used by another participant." : ""); 
                setScreenshotDialog({ open: false, payment: null }); 
              }}>
                <XCircle className="w-4 h-4 mr-2" /> Reject This Payment
              </Button>
            )}
            <Button variant="ghost" onClick={() => setScreenshotDialog({ open: false, payment: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verify Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={verifyDialog.open} onOpenChange={open => {
        if (!open) {
          setVerifyDialog({ open: false, payment: null });
          setVerifyPaymentIdType("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Confirm Verification</DialogTitle>
            <DialogDescription>Set the payment ID type and verify this payment. A confirmation email will be sent to the participant.</DialogDescription>
          </DialogHeader>
          {verifyDialog.payment && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
                {[
                  ["Participant", verifyDialog.payment.userName], 
                  ["Email", verifyDialog.payment.userEmail], 
                  ["Pass", PASS_LABELS[verifyDialog.payment.passType]], 
                  ["Transaction ID", verifyDialog.payment.transactionNumber]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
                {verifyDialog.payment.isDuplicate && (
                  <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-950/50 rounded border border-orange-200 dark:border-orange-800">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-orange-800 dark:text-orange-200">Warning: This transaction ID is used by multiple payments</span>
                  </div>
                )}
                {verifyDialog.payment.hasSpecialCharacters && (
                  <div className="flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-950/50 rounded border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-800 dark:text-amber-200">Notice: Transaction ID contains special characters</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-id-type">Payment ID Type <span className="text-red-500">*</span></Label>
                <Select value={verifyPaymentIdType} onValueChange={setVerifyPaymentIdType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI Transaction ID</SelectItem>
                    <SelectItem value="eazypay">EazyPay Transaction ID</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose based on the payment method shown in the proof.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-transaction-id">Edit Transaction ID (Optional)</Label>
                <Input
                  id="edit-transaction-id"
                  value={editedTransactionId}
                  onChange={(e) => setEditedTransactionId(e.target.value)}
                  placeholder={verifyDialog.payment?.transactionNumber || ""}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep original: <code className="text-xs">{verifyDialog.payment?.transactionNumber}</code>
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => {
              setVerifyDialog({ open: false, payment: null });
              setVerifyPaymentIdType("");
              setEditedTransactionId("");
            }} disabled={verifyLoading}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleVerify} 
              disabled={verifyLoading || !verifyPaymentIdType}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {verifyLoading ? "Verifying…" : "Verify & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ────────────────────────────────────────────────── */}
      <Dialog open={rejectDialog.open} onOpenChange={open => { if (!open) { setRejectDialog({ open: false, payment: null }); setRejectionReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-600" /> Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason — it will be included in the email sent to the participant.</DialogDescription>
          </DialogHeader>
          {rejectDialog.payment && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
                {[
                  ["Participant", rejectDialog.payment.userName], 
                  ["Pass", PASS_LABELS[rejectDialog.payment.passType]], 
                  ["Payment Type", rejectDialog.payment.paymentIdType ? (rejectDialog.payment.paymentIdType === "upi" ? "UPI Transaction ID" : "Eazy Pay Reference") : "Not Set"],
                  ["Transaction ID", rejectDialog.payment.transactionNumber]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
                {(rejectDialog.payment.isDuplicate || rejectDialog.payment.hasSpecialCharacters) && (
                  <div className="space-y-2">
                    {rejectDialog.payment.isDuplicate && (
                      <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-950/50 rounded border border-orange-200 dark:border-orange-800">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-orange-800 dark:text-orange-200">This transaction ID is already used by other payments</span>
                      </div>
                    )}
                    {rejectDialog.payment.hasSpecialCharacters && (
                      <div className="flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-950/50 rounded border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-800 dark:text-amber-200">Transaction ID contains special characters</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason <span className="text-red-500">*</span></Label>
            <Textarea id="rejection-reason" placeholder="e.g. Screenshot is unclear, transaction number does not match, payment amount is incorrect…" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="resize-none" />
            <p className="text-xs text-muted-foreground">This message is sent directly to the participant's email.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setRejectDialog({ open: false, payment: null }); setRejectionReason(""); }} disabled={rejectLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectLoading || !rejectionReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />{rejectLoading ? "Rejecting…" : "Reject & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}