"use client";

import { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BillImageModalProps {
  bill: {
    id: string;
    bill_number: string;
    vendor_name: string;
    bill_image?: string;
    bill_image_mime?: string;
  };
  onClose: () => void;
}

export function BillImageModal({ bill, onClose }: BillImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!bill.bill_image) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <p className="text-muted-foreground mb-4">No bill image available</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const imageSrc = `data:${bill.bill_image_mime || 'image/jpeg'};base64,${bill.bill_image}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `bill-${bill.bill_number}.${bill.bill_image_mime?.split('/')[1] || 'jpg'}`;
    link.click();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur rounded-t-xl border border-border border-b-0">
          <div>
            <h3 className="text-lg font-bold">Bill #{bill.bill_number}</h3>
            <p className="text-sm text-muted-foreground">{bill.vendor_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut size={18} />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
              <RotateCw size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-black/50 rounded-b-xl border border-border border-t-0 flex items-center justify-center p-4">
          <img
            src={imageSrc}
            alt={`Bill ${bill.bill_number}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
