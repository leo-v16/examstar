"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import SkeletonBuilder from "@/components/admin/SkeletonBuilder";
import ResourceUploader from "@/components/admin/ResourceUploader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExamStructure } from "@/lib/firestore";
import { getExamStructureAction, saveExamStructureAction, getAllExamIdsAction, deleteExamAction } from "@/app/actions";
import { Loader2, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AUTHORIZED_EMAIL = process.env.NEXT_PUBLIC_FIREBASE_ALLOWED_EMAIL;

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Admin logic states
  const [examId, setExamId] = useState("");
  const [structure, setStructure] = useState<ExamStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedExamId, setLoadedExamId] = useState<string | null>(null);
  const [availableSlugs, setAvailableSlugs] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        fetchAvailableSlugs();
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchAvailableSlugs = async () => {
    const result = await getAllExamIdsAction();
    if (result.success && result.data) {
      setAvailableSlugs(result.data);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleLoad = async (idToLoad?: string) => {
    const targetId = idToLoad || examId;
    if (!targetId.trim()) return;
    setLoading(true);
    try {
      const result = await getExamStructureAction(targetId);
      if (result.success && result.data) {
        setStructure(result.data);
        setLoadedExamId(targetId);
        setExamId(targetId);
        fetchAvailableSlugs();
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error loading exam structure:", error);
      alert("Failed to load structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newStructure: ExamStructure) => {
    if (!loadedExamId) return;
    setLoading(true);
    try {
      const result = await saveExamStructureAction(loadedExamId, newStructure);
      if (result.success) {
        alert("Structure saved successfully!");
        setStructure(newStructure);
        fetchAvailableSlugs();
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error saving structure:", error);
      alert("Failed to save structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (idToDelete: string) => {
    if (!confirm(`Are you sure you want to delete the exam structure for "${idToDelete}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteExamAction(idToDelete);
      if (result.success) {
        alert("Exam deleted successfully!");
        if (loadedExamId === idToDelete) {
          setStructure(null);
          setLoadedExamId(null);
          setExamId("");
        }
        fetchAvailableSlugs();
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      alert("Failed to delete exam.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Auth Loading State
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Checking Access...</span>
      </div>
    );
  }

  // 2. Unauthorized State (Logged in but wrong email)
  if (user && user.email !== AUTHORIZED_EMAIL) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-4 text-center bg-destructive/5">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">403 Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
            You are logged in as <strong>{user.email}</strong>, but you do not have permission to view this page.
        </p>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    );
  }

  // 3. Authorized Admin Dashboard
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
             Welcome, {user?.email}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive gap-2">
            <LogOut size={16} /> Logout
        </Button>
      </div>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="structure">1. Structure Builder</TabsTrigger>
          <TabsTrigger value="upload">2. Resource Uploader</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Exam</CardTitle>
              <CardDescription>Enter the exam slug (e.g., &apos;jee-mains&apos;) to edit its structure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input 
                  placeholder="Exam ID (slug)" 
                  value={examId} 
                  onChange={(e) => setExamId(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={() => handleLoad()} disabled={loading || !examId.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadedExamId === examId ? "Reload" : "Load Structure"}
                </Button>
              </div>

              {availableSlugs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Available Slugs:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSlugs.map((slug) => (
                      <div key={slug} className="group relative">
                        <Badge 
                          variant={loadedExamId === slug ? "default" : "secondary"}
                          className="cursor-pointer hover:bg-primary/80 transition-colors pr-7"
                          onClick={() => handleLoad(slug)}
                        >
                          {slug}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(slug);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {loadedExamId && structure && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Editing: <span className="font-mono text-primary">{loadedExamId}</span></h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2"
                  onClick={() => handleDelete(loadedExamId)}
                  disabled={loading}
                >
                  <Trash2 size={16} /> Delete Exam
                </Button>
              </div>
              <SkeletonBuilder 
                key={loadedExamId} // Force remount on ID change
                initialStructure={structure} 
                onSave={handleSave} 
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <ResourceUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
