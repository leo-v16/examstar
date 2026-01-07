"use client";

import React, { useState, useEffect } from "react";
import { getAllExams, Exam, addResource, getResources, deleteResource, Resource } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link as LinkIcon, Save, Trash2, FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ResourceUploader() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  // Selection States
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");

  // Form States
  const [resourceType, setResourceType] = useState<"note" | "pyq">("note");
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [driveLink, setDriveLink] = useState("");

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  
  // Existing Resources State
  const [existingResources, setExistingResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Derived Data
  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const subjects = selectedExam?.structure.subjects || [];
  
  const selectedSubjectData = subjects.find((s) => s.name === selectedSubject);
  const classes = selectedSubjectData?.classes || [];

  const selectedClassData = classes.find((c) => c.name === selectedClass);
  const chapters = selectedClassData?.chapters || [];

  // Fetch exams on mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await getAllExams();
        setExams(data);
      } catch (error) {
        console.error("Failed to load exams:", error);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  // Fetch existing resources when filters change
  useEffect(() => {
    const fetchResources = async () => {
      if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter) {
        setExistingResources([]);
        return;
      }

      setLoadingResources(true);
      try {
        const data = await getResources(
          selectedExamId,
          selectedSubject,
          selectedClass,
          selectedChapter,
          resourceType
        );
        setExistingResources(data);
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, [selectedExamId, selectedSubject, selectedClass, selectedChapter, resourceType]);

  const resetForm = () => {
    setTitle("");
    setYear("");
    setDriveLink("");
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter || !title || !driveLink) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);

    try {
      let finalUrl = driveLink;
      if (finalUrl.includes("drive.google.com") && finalUrl.includes("/view")) {
        finalUrl = finalUrl.replace("/view", "/preview");
      }

      await addResource({
        examId: selectedExamId,
        subject: selectedSubject,
        class: selectedClass,
        chapter: selectedChapter,
        type: resourceType,
        title: title,
        fileUrl: finalUrl,
        ...(resourceType === "pyq" && { year }),
      });

      alert("Resource saved successfully!");
      resetForm();
      
      const updatedResources = await getResources(
        selectedExamId,
        selectedSubject,
        selectedClass,
        selectedChapter,
        resourceType
      );
      setExistingResources(updatedResources);

    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save resource.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      await deleteResource(resourceId);
      setExistingResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (error) {
      console.error("Failed to delete resource:", error);
      alert("Failed to delete resource.");
    }
  };

  if (loadingExams) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 w-full">
      <Card className="max-w-2xl mx-auto border-dashed shadow-sm w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Add Resource Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 1. Hierarchy Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExamId} onValueChange={(val) => {
                setSelectedExamId(val);
                setSelectedSubject("");
                setSelectedClass("");
                setSelectedChapter("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.name || exam.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={(val) => {
                  setSelectedSubject(val);
                  setSelectedClass("");
                  setSelectedChapter("");
                }}
                disabled={!selectedExamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.name} value={sub.name}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select 
                value={selectedClass} 
                onValueChange={(val) => {
                  setSelectedClass(val);
                  setSelectedChapter("");
                }}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select 
                value={selectedChapter} 
                onValueChange={setSelectedChapter}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chap) => (
                    <SelectItem key={chap} value={chap}>{chap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t my-4" />

          {/* 2. Resource Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <RadioGroup 
                defaultValue="note" 
                value={resourceType} 
                onValueChange={(val: "note" | "pyq") => setResourceType(val)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="note" id="r-note" />
                  <Label htmlFor="r-note">Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pyq" id="r-pyq" />
                  <Label htmlFor="r-pyq">PYQ (Past Year Question)</Label>
                </div>
              </RadioGroup>
            </div>

            {resourceType === "pyq" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Year</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 2023" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                placeholder="e.g. Chapter 1 Summary or 2023 Question Paper" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Google Drive Link</Label>
              <Input 
                  type="text" 
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                  Make sure the file permission in Drive is set to <strong>&quot;Anyone with the link&quot;</strong>.
              </p>
            </div>
          </div>

          {/* 3. Action */}
          <div className="pt-4">
              <Button 
                  onClick={handleSave} 
                  className="w-full gap-2"
                  disabled={isSaving || !selectedChapter || !title || !driveLink}
              >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save Resource"}
              </Button>
          </div>

          {/* Existing Resources List */}
          {selectedChapter && (
            <div className="pt-6 mt-6 border-t border-dashed space-y-4 w-full max-w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Existing {resourceType === 'note' ? 'Notes' : 'PYQs'}
                </h3>
                <Badge variant="outline" className="text-muted-foreground font-normal">
                  {existingResources.length}
                </Badge>
              </div>

              {loadingResources ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : existingResources.length > 0 ? (
                <ScrollArea className="max-h-[350px] w-full rounded-md border p-2 sm:p-4">
                   <div className="flex flex-col gap-3">
                    {existingResources.map((res) => (
                      <div 
                        key={res.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                      >
                        {/* 1. Icon - Fixed (shrink-0) */}
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-5 text-primary" />
                        </div>

                        {/* 2. Text - Flexible (flex-1 + min-w-0 to force truncate) */}
                        <div className="flex-1 min-w-0 grid gap-0.5">
                          <p className="font-medium text-sm sm:text-base leading-tight truncate" title={res.title}>
                            {res.title}
                          </p>
                          {res.year && (
                            <div className="flex">
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wider">
                                Year: {res.year}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* 3. Actions - Fixed (shrink-0) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" asChild title="View Resource" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => res.id && handleDeleteResource(res.id)}
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Delete Resource"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                   </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                  No {resourceType === 'note' ? 'notes' : 'PYQs'} found for this chapter.
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}