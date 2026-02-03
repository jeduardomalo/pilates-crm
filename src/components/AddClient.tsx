"use client";

import { useState } from "react";
import { addClient } from "@/app/actions";
import { Plus } from "lucide-react";

export function AddClient() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white border border-sand-200 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-sand-50 transition-colors cursor-pointer"
      >
        <Plus size={16} />
        Add Client
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-sand-200 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-xl text-charcoal">New Client</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-2xl leading-none">&times;</button>
            </div>

            <form action={async (formData) => {
              await addClient(formData);
              setIsOpen(false);
            }} className="space-y-4">
              
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500" placeholder="e.g. Jane Doe" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Email</label>
                <input type="email" name="email" className="w-full border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500" placeholder="jane@example.com" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Initial Class Pack Balance</label>
                <input type="number" name="classPackBalance" defaultValue="0" className="w-full border border-sand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500" />
                <p className="text-[10px] text-gray-400 mt-1">Starting number of classes.</p>
              </div>

              <button type="submit" className="w-full bg-charcoal text-white py-3 rounded-lg font-medium hover:bg-black transition-colors mt-4 cursor-pointer">
                Create Profile
              </button>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
