"use client";

import { useState } from "react";
import { addSession } from "@/app/actions";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickAddSession({ clients }: { clients: any[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionType, setSessionType] = useState<"Single" | "Group">("Single");
  const [selectedClient1, setSelectedClient1] = useState("");
  const [selectedClient2, setSelectedClient2] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isPaid1, setIsPaid1] = useState(true);
  const [isPaid2, setIsPaid2] = useState(true);
  const [usePackage, setUsePackage] = useState(false);
  const [usePackage1, setUsePackage1] = useState(false);
  const [usePackage2, setUsePackage2] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      formData.append("sessionType", sessionType);
      
      // For single sessions, explicitly add isPaid and usePackage
      if (sessionType === "Single") {
        formData.append("isPaid", isPaid ? "true" : "false");
        formData.append("usePackage", usePackage ? "true" : "false");
      } else {
        // For group sessions, add isPaid1, isPaid2, usePackage1, and usePackage2
        formData.append("isPaid1", isPaid1 ? "true" : "false");
        formData.append("isPaid2", isPaid2 ? "true" : "false");
        formData.append("usePackage1", usePackage1 ? "true" : "false");
        formData.append("usePackage2", usePackage2 ? "true" : "false");
      }
      
      const result = await addSession(formData);
      
      if (result.success) {
        setIsOpen(false);
        setSessionType("Single");
        setSelectedClient1("");
        setSelectedClient2("");
        setIsPaid(true);
        setIsPaid1(true);
        setIsPaid2(true);
        setUsePackage(false);
        setUsePackage1(false);
        setUsePackage2(false);
        router.refresh();
      } else {
        alert("Failed to add session: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error adding session:", error);
      alert("Failed to add session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors cursor-pointer"
      >
        <Plus size={16} />
        Log Session
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-xl text-charcoal dark:text-white">Log Session</h2>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setSessionType("Single");
                  setSelectedClient1("");
                  setSelectedClient2("");
                  setIsPaid(true);
                  setIsPaid1(true);
                  setIsPaid2(true);
                  setUsePackage(false);
                  setUsePackage1(false);
                  setUsePackage2(false);
                }} 
                className="text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300 cursor-pointer text-2xl leading-none"
                disabled={isSubmitting}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Type Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Session Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionType("Single");
                      setSelectedClient1("");
                      setSelectedClient2("");
                      setUsePackage(false);
                    }}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sessionType === "Single"
                        ? "bg-charcoal text-white"
                        : "bg-sand-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-sand-100 dark:hover:bg-gray-600"
                    } disabled:opacity-50`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionType("Group");
                      setSelectedClient1("");
                      setSelectedClient2("");
                      setUsePackage1(false);
                      setUsePackage2(false);
                    }}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sessionType === "Group"
                        ? "bg-charcoal text-white"
                        : "bg-sand-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-sand-100 dark:hover:bg-gray-600"
                    } disabled:opacity-50`}
                  >
                    Group
                  </button>
                </div>
                <input type="hidden" name="type" value={sessionType} />
              </div>

              {/* Single Client Selection */}
              {sessionType === "Single" && (
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Client</label>
                  <select 
                    name="clientId" 
                    required 
                    disabled={isSubmitting}
                    className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Group Client Selection */}
              {sessionType === "Group" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Client 1</label>
                    <select 
                      name="clientId1" 
                      required 
                      value={selectedClient1}
                      onChange={(e) => setSelectedClient1(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select Client</option>
                      {clients
                        .filter(c => c.id !== selectedClient2)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Client 2</label>
                    <select 
                      name="clientId2" 
                      required 
                      value={selectedClient2}
                      onChange={(e) => setSelectedClient2(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select Client</option>
                      {clients
                        .filter(c => c.id !== selectedClient1)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Date</label>
                  <input 
                    type="date" 
                    name="date" 
                    required 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                    disabled={isSubmitting}
                    className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50" 
                  />
                </div>
                <div>
                   <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Location</label>
                   <select 
                     name="location" 
                     disabled={isSubmitting}
                     className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                   >
                     <option>In-Studio</option>
                     <option>Home Visit</option>
                     <option>Online</option>
                   </select>
                </div>
              </div>

              {/* Price Fields */}
              {sessionType === "Single" && (
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                    <input 
                      type="number" 
                      name="price" 
                      step="0.01" 
                      defaultValue="0.00" 
                      onWheel={(e) => e.currentTarget.blur()}
                      disabled={isSubmitting}
                      className="w-full border border-sand-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-sand-500 disabled:opacity-50" 
                    />
                  </div>
                </div>
              )}

              {sessionType === "Group" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Price for Client 1</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                      <input 
                        type="number" 
                        name="price1" 
                        step="0.01" 
                        defaultValue="0.00" 
                        required 
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isSubmitting}
                        className="w-full border border-sand-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-sand-500 disabled:opacity-50" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Price for Client 2</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                      <input 
                        type="number" 
                        name="price2" 
                        step="0.01" 
                        defaultValue="0.00" 
                        required 
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isSubmitting}
                        className="w-full border border-sand-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-sand-500 disabled:opacity-50" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {sessionType === "Single" && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isPaid" 
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      disabled={isSubmitting}
                      className="accent-sage w-4 h-4 disabled:opacity-50" 
                    />
                    <label htmlFor="isPaid" className="text-sm text-gray-600 dark:text-gray-300">Mark as Paid</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="usePackage" 
                      checked={usePackage}
                      onChange={(e) => setUsePackage(e.target.checked)}
                      disabled={isSubmitting}
                      className="accent-sage w-4 h-4 disabled:opacity-50" 
                    />
                    <label htmlFor="usePackage" className="text-sm text-gray-600 dark:text-gray-300">Use Package Class</label>
                  </div>
                </div>
              )}

              {sessionType === "Group" && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isPaid1" 
                        checked={isPaid1}
                        onChange={(e) => setIsPaid1(e.target.checked)}
                        disabled={isSubmitting}
                        className="accent-sage w-4 h-4 disabled:opacity-50" 
                      />
                      <label htmlFor="isPaid1" className="text-sm text-gray-600 dark:text-gray-300">Mark Client 1 as Paid</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="usePackage1" 
                        checked={usePackage1}
                        onChange={(e) => setUsePackage1(e.target.checked)}
                        disabled={isSubmitting}
                        className="accent-sage w-4 h-4 disabled:opacity-50" 
                      />
                      <label htmlFor="usePackage1" className="text-sm text-gray-600 dark:text-gray-300">Client 1: Use Package Class</label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isPaid2" 
                        checked={isPaid2}
                        onChange={(e) => setIsPaid2(e.target.checked)}
                        disabled={isSubmitting}
                        className="accent-sage w-4 h-4 disabled:opacity-50" 
                      />
                      <label htmlFor="isPaid2" className="text-sm text-gray-600 dark:text-gray-300">Mark Client 2 as Paid</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="usePackage2" 
                        checked={usePackage2}
                        onChange={(e) => setUsePackage2(e.target.checked)}
                        disabled={isSubmitting}
                        className="accent-sage w-4 h-4 disabled:opacity-50" 
                      />
                      <label htmlFor="usePackage2" className="text-sm text-gray-600 dark:text-gray-300">Client 2: Use Package Class</label>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-charcoal text-white py-3 rounded-lg font-medium hover:bg-black transition-colors mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Session"}
              </button>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
