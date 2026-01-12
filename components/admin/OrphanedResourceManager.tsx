"use client";

import React, { useState } from "react";
import { getOrphanedResourcesAction, moveResourceAction, getExamStructureAction, deleteResourceAction, deleteAllOrphanedResourcesAction } from "@/app/actions";
import { Resource, ExamStructure } from "@/lib/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Check, Eye, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
    examId: string;
}

export default function OrphanedResourceManager({ examId }: Props) {
    const [orphans, setOrphans] = useState<Resource[]>([]);
    const [structure, setStructure] = useState<ExamStructure | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    
    // Viewer State
    const [viewingResource, setViewingResource] = useState<Resource | null>(null);

    const fetchData = async () => {
        if (!examId) return;
        setLoading(true);
        try {
            const [orphansRes, structureRes] = await Promise.all([
                getOrphanedResourcesAction(examId),
                getExamStructureAction(examId)
            ]);

            if (orphansRes.success && orphansRes.data) {
                setOrphans(orphansRes.data);
            }
            if (structureRes.success && structureRes.data) {
                setStructure(structureRes.data);
            }
            setHasFetched(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete ALL orphaned resources? This cannot be undone.")) return;
        
        setDeletingAll(true);
        try {
            const ids = orphans.map(o => o.id).filter(id => id !== undefined) as string[];
            const res = await deleteAllOrphanedResourcesAction(ids);
            if (res.success) {
                setOrphans([]);
            } else {
                alert("Failed to delete resources: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting resources");
        } finally {
            setDeletingAll(false);
        }
    };

    if (!examId) {
        return <div className="p-4 text-center text-muted-foreground">Please load an exam first to check for orphans.</div>;
    }

    if (!hasFetched) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500 opacity-50" />
                <p className="text-muted-foreground text-center max-w-sm">
                    Check for &quot;lost&quot; resources that don&apos;t match the current exam structure.
                </p>
                <Button onClick={fetchData} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Scan for Orphans
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (orphans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-2 text-green-600">
                <Check className="h-12 w-12" />
                <p className="font-medium">No orphaned resources found!</p>
                <Button variant="outline" onClick={fetchData} size="sm" className="mt-4">Scan Again</Button>
            </div>
        );
    }

    return (
        // FIX 1: Root constraints (max-w-[100vw]) prevent horizontal scroll
        <div className="w-full max-w-[100vw] overflow-hidden">
            <Card className="border-yellow-500/20 bg-yellow-500/5 w-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <CardTitle className="flex items-center gap-2 text-yellow-600 text-lg">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                {orphans.length} Orphaned Resources
                            </CardTitle>
                            <CardDescription>
                                Resources in deleted chapters.
                            </CardDescription>
                        </div>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDeleteAll} 
                            disabled={deletingAll}
                            className="shrink-0"
                        >
                            {deletingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {/* FIX 2: Restrict ScrollArea width specifically */}
                    <ScrollArea className="h-[500px] w-full max-w-full px-2 sm:px-0">
                        <div className="space-y-4 pb-4 px-1">
                            {orphans.map(resource => (
                                <OrphanRow 
                                    key={resource.id} 
                                    resource={resource} 
                                    structure={structure} 
                                    onMoved={(id) => setOrphans(prev => prev.filter(p => p.id !== id))}
                                    onDelete={(id) => setOrphans(prev => prev.filter(p => p.id !== id))}
                                    onView={() => setViewingResource(resource)}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Dialog open={!!viewingResource} onOpenChange={(open) => !open && setViewingResource(null)}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col bg-background w-[95vw] sm:w-full">
                    <DialogHeader className="px-4 py-2 border-b shrink-0">
                        <DialogTitle className="truncate pr-8 text-base">
                            {viewingResource?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 w-full bg-black/5 relative overflow-hidden">
                        {viewingResource && (
                            <iframe
                                src={viewingResource.fileUrl}
                                className="w-full h-full border-none"
                                title="Resource Viewer"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                                loading="lazy"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function OrphanRow({ resource, structure, onMoved, onDelete, onView }: { resource: Resource, structure: ExamStructure | null, onMoved: (id: string) => void, onDelete: (id: string) => void, onView: () => void }) {
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedChapter, setSelectedChapter] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const subjects = structure?.subjects || [];
    const classes = subjects.find(s => s.name === selectedSubject)?.classes || [];
    const chapters = classes.find(c => c.name === selectedClass)?.chapters || [];

    const handleMove = async () => {
        if (!selectedSubject || !selectedClass || !selectedChapter || !resource.id) return;
        setSaving(true);
        try {
            const res = await moveResourceAction(resource.id, selectedSubject, selectedClass, selectedChapter);
            if (res.success) {
                onMoved(resource.id);
            } else {
                alert("Failed to move: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error moving resource");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!resource.id || !confirm("Delete this resource?")) return;
        setDeleting(true);
        try {
            const res = await deleteResourceAction(resource.id);
            if (res.success) {
                onDelete(resource.id);
            } else {
                alert("Failed to delete: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting resource");
        } finally {
            setDeleting(false);
        }
    };

    return (
        // FIX 3: max-w-full on the card container
        <div className="p-3 sm:p-4 rounded-lg border bg-background shadow-sm space-y-3 w-full max-w-full">
            {/* Header Section: Using the 'w-0' flex hack from before */}
            <div className="flex gap-3 w-full">
                <div 
                    className="bg-muted h-10 w-10 flex items-center justify-center rounded-md shrink-0 cursor-pointer hover:bg-muted/80 transition-colors group"
                    onClick={onView}
                    title="Click to view content"
                >
                    <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                
                {/* FIX 4: 'w-0' forces this container to start at 0 width and grow, enabling truncation */}
                <div className="flex-1 min-w-0 w-0 space-y-1">
                    <h4 
                        className="font-medium text-sm sm:text-base leading-tight truncate hover:underline cursor-pointer decoration-dotted underline-offset-2 block w-full" 
                        title={resource.title}
                        onClick={onView}
                    >
                        {resource.title}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 w-full">
                        <Badge variant="outline" className="text-[10px] sm:text-xs text-red-600 border-red-200 bg-red-50 max-w-full">
                           <span className="truncate">Missing: {resource.chapter}</span>
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs uppercase shrink-0">
                            {resource.type}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="space-y-3 pt-3 border-t w-full">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full min-w-0">
                    {/* FIX 5: The Select Truncation Hack again (forces selects to stay inside container) */}
                    <div className="w-full min-w-0">
                        <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedClass(""); setSelectedChapter(""); }}>
                            <SelectTrigger className="h-8 text-xs w-full [&>span]:truncate [&>span]:block [&>span]:text-left">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full min-w-0">
                        <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedChapter(""); }} disabled={!selectedSubject}>
                            <SelectTrigger className="h-8 text-xs w-full [&>span]:truncate [&>span]:block [&>span]:text-left">
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full min-w-0">
                        <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedClass}>
                            <SelectTrigger className="h-8 text-xs w-full [&>span]:truncate [&>span]:block [&>span]:text-left">
                                <SelectValue placeholder="Chapter" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[250px]">
                                {chapters.map(c => <SelectItem key={c} value={c}><span className="truncate block">{c}</span></SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-2 w-full pt-1">
                    <Button 
                        size="sm" 
                        onClick={handleMove} 
                        disabled={saving || !selectedChapter || deleting}
                        className="h-9 text-xs flex-1 gap-2"
                    >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Move Resource
                    </Button>
                    <Button 
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting || saving}
                        className="h-9 gap-2 px-4 text-xs"
                        title="Delete Resource"
                    >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        <span>Delete</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}