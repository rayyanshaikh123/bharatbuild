"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, ArrowLeft, UserX, Trash2, Plus, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, managerBlacklist, ManagerOrgRequest, BlacklistEntry } from "@/lib/api/manager";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ManagerBlacklistPage() {
    const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [labourId, setLabourId] = useState("");
    const [reason, setReason] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);

            const reqsRes = await managerOrganization.getMyRequests();
            const approved = reqsRes.requests?.find(r => r.status === "APPROVED");

            if (approved) {
                setApprovedOrg(approved);
                const blacklistRes = await managerBlacklist.getAll(approved.org_id);
                setBlacklist(blacklistRes.blacklist || []);
            }
        } catch (err) {
            console.error("Failed to fetch blacklist:", err);
            toast.error("Failed to load blacklist");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRemove = async (id: string) => {
        if (!approvedOrg) return;
        setIsDeleting(id);
        try {
            await managerBlacklist.remove(id, approvedOrg.org_id);
            toast.success("Labourer removed from blacklist");
            fetchData();
        } catch (err) {
            console.error("Failed to remove:", err);
            toast.error("Failed to remove labourer");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvedOrg) return;
        if (!labourId || !reason) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsAdding(true);
        try {
            await managerBlacklist.add(approvedOrg.org_id, labourId, reason);
            toast.success("Labourer blacklisted successfully");
            setIsDialogOpen(false);
            setLabourId("");
            setReason("");
            fetchData();
        } catch (err: any) {
            console.error("Failed to add:", err);
            toast.error(err.response?.data?.error || "Failed to blacklist labourer");
        } finally {
            setIsAdding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!approvedOrg) {
        return (
            <div className="text-center py-12">
                <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground">Not Approved</h2>
                <p className="text-muted-foreground mt-2">Join an organization first.</p>
                <Link href="/manager">
                    <Button className="mt-4">Go to Dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pt-12 md:pt-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/manager">
                        <Button variant="outline" size="sm">
                            <ArrowLeft size={16} className="mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
                            Organization <span className="text-primary">Blacklist</span>
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage blacklisted labourers for {approvedOrg.org_name}
                        </p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl shadow-lg shadow-primary/20">
                            <Plus size={18} className="mr-2" /> Blacklist Labourer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Blacklist Labourer</DialogTitle>
                            <DialogDescription>
                                Enter the labourer's ID and the reason for blacklisting.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Labourer ID</label>
                                <Input
                                    placeholder="Enter Labourer UUID"
                                    value={labourId}
                                    onChange={(e) => setLabourId(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Tip: You can find this in project attendance or wage records.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reason</label>
                                <textarea
                                    className="w-full min-h-[100px] bg-muted/50 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Enter reason for blacklisting..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Blacklist"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-2xl border-l-4 border-primary">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <UserX className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Blacklisted</p>
                            <p className="text-2xl font-black italic">{blacklist.length}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl md:col-span-2 bg-blue-500/5 border-blue-500/20">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 mt-1" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <span className="font-bold">Did you know?</span> Labourers are automatically blacklisted if they commit 3 or more geofence breaches in a single day. Blacklisted labourers cannot see or apply for jobs in your organization.
                        </div>
                    </div>
                </div>
            </div>

            {/* Blacklist Table/List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                    <h3 className="font-bold text-foreground uppercase tracking-widest text-sm flex items-center gap-2">
                        <ShieldAlert size={16} className="text-primary" />
                        Current Register
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 w-[250px] h-9 bg-background/50 border-border/50 rounded-lg text-xs" placeholder="Filter by name or phone..." />
                    </div>
                </div>

                {blacklist.length === 0 ? (
                    <div className="text-center py-16">
                        <UserX className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground">Clear Record</h3>
                        <p className="text-muted-foreground/60 max-w-xs mx-auto mt-2">No labourers are currently blacklisted in your organization.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {blacklist.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-muted/30 transition-colors group"
                            >
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-600">
                                            <UserX size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-lg">{entry.labour_name || "Unknown"}</h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium uppercase tracking-tighter">{entry.skill_type || 'Labour'}</span>
                                                • {entry.labour_phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-xl border border-border/50 mt-2">
                                        <p className="text-sm font-medium text-foreground italic">"{entry.reason}"</p>
                                        <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest">
                                            Blacklisted on {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center md:flex-col justify-end gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isDeleting === entry.id}
                                        onClick={() => handleRemove(entry.id)}
                                        className="border-red-500/30 text-red-600 hover:bg-red-500/10 rounded-xl px-4"
                                    >
                                        {isDeleting === entry.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 size={16} className="mr-2" /> Remove
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Security Notice */}
            <div className="bg-muted/30 border border-border rounded-2xl p-6">
                <h4 className="font-bold text-foreground mb-4 uppercase tracking-widest text-xs">Security & Compliance</h4>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            Impact of Blacklisting
                        </h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            When a labourer is blacklisted, they are immediately barred from viewing any jobs or applying for work within any project owned by this organization. Existing applications are also filtered out.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            Automated Enforcement
                        </h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            The system monitors geofence compliance in real-time. Continuous breaches result in automatic blacklisting to protect project integrity and site security.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
