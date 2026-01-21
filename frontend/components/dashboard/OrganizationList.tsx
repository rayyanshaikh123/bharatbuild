"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Briefcase, Loader2 } from "lucide-react";
import { ownerOrganization, Organization } from "@/lib/api/owner";
import { CreateOrganizationForm } from "./CreateOrganizationForm";

interface OwnerOrganizationProps {
  onOrganizationLoad?: (org: Organization | null) => void;
}

export function OwnerOrganization({ onOrganizationLoad }: OwnerOrganizationProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      const response = await ownerOrganization.getAll();
      // Owner can only have one organization
      if (response.organizations && response.organizations.length > 0) {
        const org = response.organizations[0];
        setOrganization(org);
        onOrganizationLoad?.(org);
      } else {
        onOrganizationLoad?.(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
      onOrganizationLoad?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const handleCreateSuccess = () => {
    fetchOrganization();
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Owner already has an organization - show it
  if (organization) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
          Your Organization
        </h3>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Building2 size={28} />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-foreground">{organization.name}</h4>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {organization.address}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={14} />
                {organization.office_phone}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase size={14} />
                {organization.org_type}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No organization yet - show create form
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
          Create Your Organization
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your organization to start managing projects and teams.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      )}

      <CreateOrganizationForm onSuccess={handleCreateSuccess} />
    </div>
  );
}
