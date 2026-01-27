"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, ArrowLeft, UserX, Trash2, Search, Info, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerBlacklist, BlacklistEntry } from "@/lib/api/owner";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function OwnerBlacklistPage() {
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const res = await ownerBlacklist.getAll();
            setBlacklist(res.blacklist || []);
        } catch (err) {
            console.error("Failed to fetch blacklist:", err);
            toast.error("Failed to load global blacklist");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRemove = async (id: string) => {
        setIsDeleting(id);
        try {
            await ownerBlacklist.remove(id);
            toast.success("Labourer removed from organization blacklist");
            fetchData();
        } catch (err) {
            console.error("Failed to remove:", err);
            toast.error("Failed to remove labourer");
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredBlacklist = blacklist.filter(entry =>
        entry.labour_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.labour_phone?.includes(searchQuery) ||
        entry.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pt-12 md:pt-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/owner">
                        <Button variant="outline" size="sm">
                            <ArrowLeft size={16} className="mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
                            Global <span className="text-primary">Blacklist</span>
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Consolidated blacklist across all your organizations
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-2xl border-l-4 border-primary">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Across Organizations</p>
                            <p className="text-2xl font-black italic">{blacklist.length}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl md:col-span-2 bg-primary/5 border-primary/20">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-primary mt-1" />
                        <div className="text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">Global Control.</span> As an owner, you can view and manage blacklisted labourers across all your organizations. Blacklisting is organization-specific but enforced at the job application level.
                        </div>
                    </div>
                </div>
            </div>

            {/* Blacklist Table/List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
                <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
                    <h3 className="font-bold text-foreground uppercase tracking-widest text-xs flex items-center gap-2">
                        <UserX size={16} className="text-primary" />
                        Blacklist Registry
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9 w-full md:w-[300px] bg-background/50 border-border/50 rounded-xl"
                            placeholder="Search name, phone or organization..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {filteredBlacklist.length === 0 ? (
                    <div className="text-center py-24">
                        <ShieldAlert className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground">No Records Found</h3>
                        <p className="text-muted-foreground/60 max-w-xs mx-auto mt-2">
                            {searchQuery ? "No results match your search criteria." : "There are no blacklisted labourers across your organizations."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Labourer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Organization</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Reason / Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredBlacklist.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <UserX size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground">{entry.labour_name || "Unknown"}</div>
                                                    <div className="text-xs text-muted-foreground">{entry.labour_phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-foreground">
                                                <Building2 size={14} className="text-muted-foreground" />
                                                {entry.organization_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[300px]">
                                                <div className="text-sm font-medium text-foreground line-clamp-1 italic mb-1">"{entry.reason}"</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                                    {new Date(entry.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={isDeleting === entry.id}
                                                onClick={() => handleRemove(entry.id)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl h-9"
                                            >
                                                {isDeleting === entry.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 size={16} className="mr-2" /> Remove
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
