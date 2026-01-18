"use client";

import { useState } from "react";
import { Building2, MapPin, Phone, Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { ownerOrganization } from "@/lib/api/owner";

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
}

const ORG_TYPES = [
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "OTHER", label: "Other" },
];

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    org_type: "CONSTRUCTION",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await ownerOrganization.create(formData);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Organization Created!</h3>
        <p className="text-muted-foreground text-sm">
          Your organization has been set up successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Organization Name */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Building2 className="h-3 w-3" />
          Organization Name
        </label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="ABC Construction Pvt. Ltd."
          className="h-12 bg-background/50 border-border/50 focus:border-primary"
          required
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          Office Address
        </label>
        <Input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main Street, City, State"
          className="h-12 bg-background/50 border-border/50 focus:border-primary"
          required
        />
      </div>

      {/* Two column layout for phone and type */}
      <div className="grid grid-cols-2 gap-4">
        {/* Phone */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Phone className="h-3 w-3" />
            Office Phone
          </label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            className="h-12 bg-background/50 border-border/50 focus:border-primary"
            required
          />
        </div>

        {/* Organization Type */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-3 w-3" />
            Type
          </label>
          <select
            name="org_type"
            value={formData.org_type}
            onChange={handleChange}
            className="h-12 w-full bg-background/50 border border-border/50 rounded-md px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          >
            {ORG_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 text-sm uppercase tracking-widest font-bold group"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Create Organization"
        )}
      </Button>
    </form>
  );
}
