"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReceiptModalProps {
  session: any;
  onClose: () => void;
}

export function ReceiptModal({ session, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) {
      console.error("Receipt ref not available");
      return;
    }

    setIsGenerating(true);
    try {
      // Wait a bit to ensure the content is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: receiptRef.current.scrollWidth,
        height: receiptRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Replace any problematic color functions with hex colors
          const clonedElement = clonedDoc.querySelector('[data-receipt-content]') as HTMLElement;
          if (clonedElement) {
            // Force all colors to be hex values
            const style = clonedElement.style;
            style.color = "#333333";
            style.backgroundColor = "#ffffff";
          }
        }
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      
      // Create PDF in A4 format
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Convert canvas dimensions from pixels to mm (assuming 96 DPI)
      const mmToPx = 3.779527559; // 1mm = 3.779527559px at 96 DPI
      const imgWidthMm = canvas.width / mmToPx;
      const imgHeightMm = canvas.height / mmToPx;

      // Calculate scaling to fit within PDF page
      const widthRatio = pdfWidth / imgWidthMm;
      const heightRatio = pdfHeight / imgHeightMm;
      const ratio = Math.min(widthRatio, heightRatio, 1); // Don't scale up

      const finalWidth = imgWidthMm * ratio;
      const finalHeight = imgHeightMm * ratio;

      // Center the image
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = 0;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);
      
      const fileName = `Receipt_${format(new Date(session.date), "yyyy-MM-dd")}_${session.clients[0]?.name?.replace(/\s+/g, "_") || "Session"}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please check the console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const totalAmount = Number(session.price) * session.clients.length;
  const sessionDate = new Date(session.date);

  // Receipt styles using only hex colors
  const receiptStyles = {
    container: {
      backgroundColor: "#ffffff",
      padding: "32px",
      maxWidth: "512px",
      margin: "0 auto",
      minWidth: "500px",
      color: "#333333",
      fontFamily: "serif"
    } as React.CSSProperties,
    header: {
      textAlign: "center" as const,
      marginBottom: "32px",
      paddingBottom: "32px",
      borderBottom: "2px solid #333333"
    },
    title: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "#333333",
      marginBottom: "8px",
      fontFamily: "serif"
    },
    subtitle: {
      fontSize: "14px",
      color: "#6b7280"
    },
    section: {
      marginBottom: "24px"
    },
    label: {
      fontSize: "12px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.1em",
      color: "#9ca3af",
      fontWeight: "500",
      marginBottom: "8px"
    },
    value: {
      color: "#333333",
      fontSize: "14px"
    },
    borderTop: {
      borderTop: "1px solid #e5e0d8",
      paddingTop: "24px",
      marginBottom: "24px"
    },
    borderTopThick: {
      borderTop: "2px solid #333333",
      paddingTop: "24px"
    },
    total: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#333333",
      fontFamily: "serif"
    },
    badge: {
      padding: "4px 12px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: "500",
      ...(session.isPaid ? {
        backgroundColor: "#d1fae5",
        color: "#065f46",
        border: "1px solid #a7f3d0"
      } : {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a"
      })
    },
    footer: {
      marginTop: "48px",
      paddingTop: "24px",
      borderTop: "1px solid #e5e0d8",
      textAlign: "center" as const
    },
    footerText: {
      fontSize: "12px",
      color: "#9ca3af"
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-sand-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sand-200">
          <h2 className="font-serif text-2xl text-charcoal">Receipt</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {isGenerating ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-sand-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div ref={receiptRef} data-receipt-content style={receiptStyles.container}>
            {/* Company Header */}
            <div style={receiptStyles.header}>
              <h1 style={receiptStyles.title}>The Way LLC</h1>
              <p style={receiptStyles.subtitle}>Client Management</p>
            </div>

            {/* Receipt Details */}
            <div style={{ marginBottom: "32px" }}>
              <div style={receiptStyles.section}>
                <p style={receiptStyles.label}>Receipt Number</p>
                <p style={{ ...receiptStyles.value, fontFamily: "monospace", fontSize: "14px" }}>
                  {session.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div style={receiptStyles.section}>
                <p style={receiptStyles.label}>Date</p>
                <p style={receiptStyles.value}>{format(sessionDate, "MMMM d, yyyy")}</p>
              </div>

              <div style={receiptStyles.section}>
                <p style={receiptStyles.label}>Session Type</p>
                <p style={receiptStyles.value}>{session.type}</p>
              </div>

              <div style={receiptStyles.section}>
                <p style={receiptStyles.label}>Location</p>
                <p style={receiptStyles.value}>{session.location}</p>
              </div>

              <div style={receiptStyles.section}>
                <p style={receiptStyles.label}>Client(s)</p>
                <div style={{ marginTop: "4px" }}>
                  {session.clients.map((client: any) => (
                    <p key={client.id} style={receiptStyles.value}>{client.name}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={receiptStyles.borderTop}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {session.clients.map((client: any) => (
                  <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ ...receiptStyles.value, fontWeight: "500" }}>{client.name}</p>
                      <p style={{ fontSize: "12px", color: "#6b7280" }}>{session.type} Session</p>
                    </div>
                    <p style={{ ...receiptStyles.value, fontFamily: "serif" }}>
                      ${Number(session.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div style={receiptStyles.borderTopThick}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontSize: "18px", fontWeight: "500", color: "#333333" }}>Total</p>
                <p style={receiptStyles.total}>${totalAmount.toFixed(2)}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                <p style={{ fontSize: "14px", color: "#6b7280" }}>Payment Status</p>
                <span style={receiptStyles.badge}>
                  {session.type !== "Package Purchase" && Number(session.price) === 0
                    ? "Package"
                    : session.isPaid
                      ? "Paid"
                      : "Pending"}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={receiptStyles.footer}>
              <p style={receiptStyles.footerText}>Thank you for your business!</p>
              <p style={{ ...receiptStyles.footerText, marginTop: "8px" }}>
                Receipt generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
