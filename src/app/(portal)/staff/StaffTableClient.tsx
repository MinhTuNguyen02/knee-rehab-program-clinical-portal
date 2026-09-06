"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/management/SearchBar";
import { DataTable } from "@/components/data-display/DataTable";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import {
  UserPlus,
  Shield,
  UserCheck,
  ShieldAlert,
  Power,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

interface StaffAccount {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface StaffTableClientProps {
  initialData: StaffAccount[];
  currentUser: {
    id: string;
    email: string;
    role: string;
  };
}

export function StaffTableClient({ initialData, currentUser }: StaffTableClientProps) {
  const router = useRouter();
  const [data, setData] = useState<StaffAccount[]>(initialData || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("email");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Create Staff Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<"doctor" | "admin">("doctor");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status toggle loading state (record ID in progress)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch updated list from backend
  const refetchStaff = async () => {
    try {
      const res = await fetch("/api/staff/accounts");
      if (res.ok) {
        const result = await res.json();
        setData(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (err) {
      console.error("Failed to refresh staff accounts", err);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (staff: StaffAccount) => {
    if (staff.id === currentUser.id || staff.email.toLowerCase() === currentUser.email.toLowerCase()) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    const nextStatus = !staff.isActive;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${actionLabel} account "${staff.email}"?`)) {
      return;
    }

    setTogglingId(staff.id);
    try {
      const res = await fetch(`/api/staff/accounts/${staff.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMsg = responseData.error?.message || responseData.message || `Failed to ${actionLabel} account`;
        toast.error(errorMsg);
      } else {
        toast.success(`Account ${staff.email} ${nextStatus ? "activated" : "deactivated"} successfully!`);
        setData((prev) =>
          prev.map((item) => (item.id === staff.id ? { ...item, isActive: nextStatus } : item))
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update account status");
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Create Staff Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setFieldErrors({});

    let hasError = false;
    const errors: typeof fieldErrors = {};

    if (!newEmail) {
      errors.email = "Email is required";
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      errors.email = "Invalid email format";
      hasError = true;
    }

    if (!newPassword || newPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
      hasError = true;
    }

    if (newPassword !== newConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const resData = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        const errorMsgs = Array.isArray(resData.message)
          ? resData.message
          : (resData.error?.message ? [resData.error.message] : [resData.message || "Failed to create account"]);
        
        const backendErrors: typeof fieldErrors = {};
        let generalErr: string | null = null;

        errorMsgs.forEach((msg: string) => {
          const l = msg.toLowerCase();
          if (l.includes("email")) backendErrors.email = msg;
          else if (l.includes("password")) backendErrors.password = msg;
          else generalErr = msg;
        });

        if (Object.keys(backendErrors).length > 0) setFieldErrors(backendErrors);
        if (generalErr) setCreateError(generalErr);
      } else {
        toast.success(`Staff account (${newEmail}) created successfully!`);
        setIsCreateModalOpen(false);
        setNewEmail("");
        setNewPassword("");
        setNewConfirmPassword("");
        setNewRole("doctor");
        // Refetch list to show new account
        await refetchStaff();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setCreateError("Failed to connect to the server.");
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search by email
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((staff) => staff.email?.toLowerCase().includes(q));
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((staff) => staff.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const isFilterActive = statusFilter === "active";
      result = result.filter((staff) => (staff.isActive !== false) === isFilterActive);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof StaffAccount];
      let valB: any = b[sortField as keyof StaffAccount];

      if (sortField === "status") {
        valA = a.isActive !== false ? 1 : 0;
        valB = b.isActive !== false ? 1 : 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Header section synchronized with Assessments & Leads */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage staff accounts, assign roles, and toggle access permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setFieldErrors({});
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors active:scale-[0.98] cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Staff</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="w-full md:max-w-sm">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search staff by email..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="block rounded-md border-0 py-2 pl-3 pr-8 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block rounded-md border-0 py-2 pl-3 pr-8 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={refetchStaff}
            title="Refresh staff list"
            className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Staff Accounts DataTable */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DataTable
          columns={[
            {
              key: "email",
              label: "Email",
              sortable: true,
              className: "font-medium text-slate-900 dark:text-white",
              render: (staff: StaffAccount) => {
                const isCurrent =
                  staff.id === currentUser.id ||
                  staff.email.toLowerCase() === currentUser.email.toLowerCase();
                return (
                  <div className="flex items-center gap-2">
                    <span className="truncate">{staff.email}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        You
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "role",
              label: "Role",
              sortable: true,
              render: (staff: StaffAccount) => {
                const isAdmin = staff.role === "admin";
                return isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                    <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Doctor</span>
                  </span>
                );
              },
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              render: (staff: StaffAccount) => {
                const isActive = staff.isActive !== false;
                return isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Inactive</span>
                  </span>
                );
              },
            },
            {
              key: "action",
              label: "Active Action",
              sortable: false,
              render: (staff: StaffAccount) => {
                const isCurrent =
                  staff.id === currentUser.id ||
                  staff.email.toLowerCase() === currentUser.email.toLowerCase();
                const isActive = staff.isActive !== false;
                const isToggling = togglingId === staff.id;

                if (isCurrent) {
                  return (
                    <span
                      title="You cannot deactivate your own account"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Current User</span>
                    </span>
                  );
                }

                return (
                  <button
                    onClick={() => handleToggleStatus(staff)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border-rose-200 dark:border-rose-900/40"
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-900/40"
                    }`}
                  >
                    <Power className={`w-3.5 h-3.5 ${isToggling ? "animate-spin" : ""}`} />
                    <span>{isToggling ? "Updating..." : isActive ? "Deactivate" : "Activate"}</span>
                  </button>
                );
              },
            },
          ]}
          data={filteredAndSortedData}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyStateMessage="No staff accounts found matching your criteria."
        />
      </div>

      {/* Create Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
        title="Create Staff Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create a new Doctor or Admin account to access the clinical portal.
          </p>

          {createError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Staff Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewRole("doctor")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  newRole === "doctor"
                    ? "border-primary bg-primary/5 text-primary dark:bg-primary/20"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Doctor</span>
              </button>
              <button
                type="button"
                onClick={() => setNewRole("admin")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  newRole === "admin"
                    ? "border-primary bg-primary/5 text-primary dark:bg-primary/20"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              htmlFor="staff-email"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="staff-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@krps.com"
                className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${
                  fieldErrors.email
                    ? "ring-red-300 focus:ring-red-500 dark:ring-red-900/50"
                    : "ring-slate-200 focus:ring-primary dark:ring-slate-700"
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              htmlFor="staff-password"
            >
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${
                  fieldErrors.password
                    ? "ring-red-300 focus:ring-red-500 dark:ring-red-900/50"
                    : "ring-slate-200 focus:ring-primary dark:ring-slate-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password input */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              htmlFor="staff-confirm-password"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="staff-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={newConfirmPassword}
                onChange={(e) => setNewConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${
                  fieldErrors.confirmPassword
                    ? "ring-red-300 focus:ring-red-500 dark:ring-red-900/50"
                    : "ring-slate-200 focus:ring-primary dark:ring-slate-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Creating..." : `Create ${newRole === "admin" ? "Admin" : "Doctor"}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
