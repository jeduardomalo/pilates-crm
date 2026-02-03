"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, Edit2, Check, X as XIcon, Search, Trash2 } from "lucide-react";
import { ClientDetailModal } from "@/components/ClientDetailModal";
import { updateClient, deleteClient } from "@/app/actions";
import { useRouter } from "next/navigation";

type SortField = "name" | "email" | "phone" | "status" | "classPackBalance" | "createdAt";
type SortDirection = "asc" | "desc";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  classPackBalance: number;
  hasPurchasedPackage?: boolean;
  zeroBalanceWarningDismissed?: boolean;
  createdAt: Date | string;
}

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients: initialClients }: ClientsTableProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ clientId: string; field: "name" | "email" | "phone" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Update clients when initialClients changes
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const handleStartEdit = (clientId: string, field: "name" | "email" | "phone", currentValue: string | null) => {
    setEditingField({ clientId, field });
    setEditValue(currentValue || "");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    const client = clients.find(c => c.id === editingField.clientId);
    if (!client) return;

    const updateData: { name?: string; email?: string | null; phone?: string | null } = {};
    if (editingField.field === "name") {
      updateData.name = editValue.trim();
    } else if (editingField.field === "email") {
      updateData.email = editValue.trim() || null;
    } else if (editingField.field === "phone") {
      updateData.phone = editValue.trim() || null;
    }

    const result = await updateClient(editingField.clientId, updateData);
    
    if (result.success) {
      setClients(clients.map(c => 
        c.id === editingField.clientId 
          ? { ...c, ...updateData }
          : c
      ));
      setEditingField(null);
      setEditValue("");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setDeletingClientId(clientId);
    try {
      const result = await deleteClient(clientId);
      if (result.success) {
        setClients(clients.filter(c => c.id !== clientId));
        setShowDeleteConfirm(null);
        router.refresh();
      } else {
        alert("Failed to delete client: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    } finally {
      setDeletingClientId(null);
    }
  };

  const EditableCell = ({ 
    client, 
    field, 
    value,
    onClick
  }: { 
    client: Client; 
    field: "name" | "email" | "phone"; 
    value: string | null;
    onClick?: () => void;
  }) => {
    const isEditing = editingField?.clientId === client.id && editingField?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") handleCancelEdit();
            }}
            className="flex-1 px-2 py-1 text-sm border border-sand-300 rounded focus:outline-none focus:border-sage"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveEdit}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Save"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="p-1 text-gray-500 hover:bg-gray-50 rounded transition-colors"
            title="Cancel"
          >
            <XIcon size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group/cell w-full">
        {onClick ? (
          <button
            onClick={onClick}
            className="font-medium text-charcoal hover:text-sage-700 transition-colors hover:underline flex-1 text-left"
          >
            {value || <span className="text-gray-400 italic">—</span>}
          </button>
        ) : (
          <span className="text-gray-700 flex-1 text-left">{value || <span className="text-gray-400 italic">—</span>}</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit(client.id, field, value);
          }}
          className="opacity-0 group-hover/cell:opacity-100 p-1 text-gray-400 hover:text-sage transition-all"
          title={`Edit ${field}`}
        >
          <Edit2 size={14} />
        </button>
      </div>
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedClients = useMemo(() => {
    const sorted = [...clients];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "phone":
          aValue = (a.phone || "").toLowerCase();
          bValue = (b.phone || "").toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "classPackBalance":
          aValue = a.classPackBalance;
          bValue = b.classPackBalance;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [clients, sortField, sortDirection]);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) {
      return sortedClients;
    }

    const term = searchTerm.toLowerCase().trim();
    return sortedClients.filter(client => 
      client.name.toLowerCase().includes(term) ||
      (client.email && client.email.toLowerCase().includes(term)) ||
      (client.phone && client.phone.toLowerCase().includes(term))
    );
  }, [sortedClients, searchTerm]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="inline-block w-4 h-4 opacity-30">
          <ChevronUp className="w-3 h-3" />
        </span>
      );
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search clients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage bg-white text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Table: horizontal scroll on small screens */}
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl border border-sand-200 shadow-sm bg-white dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-50 border-b border-sand-200">
            <tr>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center gap-2">
                  Email
                  <SortIcon field="email" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("phone")}
              >
                <div className="flex items-center gap-2">
                  Phone
                  <SortIcon field="phone" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-right cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("classPackBalance")}
              >
                <div className="flex items-center justify-end gap-2">
                  Pack Balance
                  <SortIcon field="classPackBalance" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-right cursor-pointer hover:bg-sand-100 transition-colors select-none"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center justify-end gap-2">
                  Joined
                  <SortIcon field="createdAt" />
                </div>
              </th>
              <th className="px-6 py-4 font-medium text-gray-500 uppercase tracking-wider text-xs text-center w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {filteredClients.map((client) => {
              return (
                <tr key={client.id} className="hover:bg-sand-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <EditableCell 
                      client={client} 
                      field="name" 
                      value={client.name}
                      onClick={() => setSelectedClientId(client.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <EditableCell client={client} field="email" value={client.email} />
                  </td>
                  <td className="px-6 py-4">
                    <EditableCell client={client} field="phone" value={client.phone} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      client.status === "Active" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-gray-50 text-gray-700 border-gray-100"
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-serif text-lg text-charcoal">
                      {client.classPackBalance}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(client.id);
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic font-serif">
                  {searchTerm ? `No clients found matching "${searchTerm}"` : "No clients found. Add your first client."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <ClientDetailModal 
        clientId={selectedClientId} 
        onClose={() => setSelectedClientId(null)}
        onClientClick={(clientId) => setSelectedClientId(clientId)}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-sand-200 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-serif text-xl text-charcoal mb-2">Delete Client</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{clients.find(c => c.id === showDeleteConfirm)?.name}</strong>? This action cannot be undone and will also remove all associated sessions.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={deletingClientId !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(showDeleteConfirm)}
                disabled={deletingClientId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingClientId === showDeleteConfirm ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
