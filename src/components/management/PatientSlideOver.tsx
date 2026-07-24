"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserCircle, EnvelopeSimple, Phone, CalendarBlank, GenderIntersex, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { LeadAssessmentsClient } from "@/components/features/LeadAssessmentsClient";
import { formatDate } from "@/lib/utils";

interface PatientSlideOverProps {
  patientId: string | null;
  onClose: () => void;
}

export function PatientSlideOver({ patientId, onClose }: PatientSlideOverProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Control entrance and exit animations
  useEffect(() => {
    if (patientId) {
      setActivePatientId(patientId);

      const timer = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);

      const timer = setTimeout(() => setActivePatientId(null), 300);
      return () => clearTimeout(timer);
    }
  }, [patientId]);

  // Fetch patient profile details when activePatientId changes
  useEffect(() => {
    if (!activePatientId) {
      setPatient(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/leads/${activePatientId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to load patient profile data.");
        }
        return res.json();
      })
      .then((data) => {
        setPatient(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activePatientId]);

  // Keyboard accessibility: Escape key closes the drawer
  useEffect(() => {
    if (!activePatientId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        setTimeout(onClose, 300);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePatientId, onClose]);

  // Prevent background scrolling when slide-over is open
  useEffect(() => {
    if (activePatientId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activePatientId]);

  if (!mounted || !activePatientId) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
      />

      {/* Slide-over panel wrapper */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div
          className={`w-screen max-w-2xl sm:max-w-3xl bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform border-l border-slate-100 ${visible ? "translate-x-0" : "translate-x-full"
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {loading ? "Loading Profile..." : patient ? `${patient.data.firstName} ${patient.data.lastName}` : "Patient Details"}
              </h2>
              {patient && !loading && (
                <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                  <CalendarBlank size={14} />
                  Added on {formatDate(patient.data.createdAt)}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onClose, 300);
              }}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-350"
              aria-label="Close panel"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Drawer Body Scroll Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-3 text-slate-500 text-sm">Loading patient profile...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-medium text-red-800 text-left">Error loading details</h3>
                <p className="mt-1 text-sm text-red-650 text-left">{error}</p>
              </div>
            ) : patient ? (
              <>
                {/* General Info Grid Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Patient Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><EnvelopeSimple size={14} /> Email</span>
                      <p className="text-md text-slate-900 font-semibold break-all">{patient.data.email || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><Phone size={14} /> Mobile</span>
                      <p className="text-md text-slate-900 font-semibold">{patient.data.mobile || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><UserCircle size={14} /> Age</span>
                      <p className="text-md text-slate-900 font-semibold">{patient.data.age || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><GenderIntersex size={14} /> Gender</span>
                      <p className="text-md text-slate-900 font-semibold capitalize">{patient.data.gender || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><WarningCircle size={14} /> Knee Side</span>
                      <p className="text-md text-slate-900 font-semibold capitalize">
                        {({ "R": "Right", "L": "Left", "B": "Both" } as Record<string, string>)[patient.data.kneeSide] || patient.data.kneeSide || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1"><CheckCircle size={14} /> Consent</span>
                      <p className="text-md text-slate-900 font-semibold">{patient.data.consentAccepted ? "Accepted" : "Not accepted"}</p>
                    </div>
                  </div>
                </div>

                {/* Notifications & Preferences Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Preferences</h3>
                  <div>
                    <span className="text-sm font-medium text-slate-500">Notifications</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {patient.data.notificationPrefs && Object.keys(patient.data.notificationPrefs).length > 0 ? (
                        Object.entries(patient.data.notificationPrefs)
                          .filter(([_, value]) => value)
                          .map(([pref]) => (
                            <span key={pref} className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-800 uppercase">
                              {pref.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ').trim()}
                            </span>
                          ))
                      ) : (
                        <span className="text-sm text-slate-450 italic">No preferences configured</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient's Historical Assessment Log Card */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Assessment History</h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <LeadAssessmentsClient assessments={patient.data.assessments || []} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
