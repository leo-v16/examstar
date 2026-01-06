"use client";

import React, { useState } from "react";
import { Plus, Trash, ChevronRight, Save, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExamStructure, Subject, ClassLevel } from "@/lib/firestore";
import { cn } from "@/lib/utils";

interface SkeletonBuilderProps {
  initialStructure?: ExamStructure;
  onSave: (structure: ExamStructure) => void;
}

const emptyStructure: ExamStructure = { subjects: [] };

export default function SkeletonBuilder({ initialStructure, onSave }: SkeletonBuilderProps) {
  const [structure, setStructure] = useState<ExamStructure>(initialStructure || emptyStructure);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number | null>(null);
  const [selectedClassIndex, setSelectedClassIndex] = useState<number | null>(null);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'subjects' | 'classes' | 'chapters'>('subjects');

  // Dialog states
  const [newItemName, setNewItemName] = useState("");
  const [editItemName, setEditItemName] = useState("");

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);

  // -- Handlers --

  const handleAddSubject = () => {
    if (!newItemName.trim()) return;
    const newSubject: Subject = { name: newItemName, classes: [] };
    setStructure(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
    setNewItemName("");
    setIsAddingSubject(false);
  };

  const handleUpdateSubject = () => {
    if (editingSubjectIndex === null || !editItemName.trim()) return;
    const newSubjects = [...structure.subjects];
    newSubjects[editingSubjectIndex].name = editItemName;
    setStructure({ ...structure, subjects: newSubjects });
    setEditingSubjectIndex(null);
    setEditItemName("");
  };

  const handleDeleteSubject = (index: number) => {
    const newSubjects = [...structure.subjects];
    newSubjects.splice(index, 1);
    setStructure({ ...structure, subjects: newSubjects });
    if (selectedSubjectIndex === index) {
      setSelectedSubjectIndex(null);
      setSelectedClassIndex(null);
    }
  };

  const handleAddClass = () => {
    if (selectedSubjectIndex === null || !newItemName.trim()) return;
    const newClass: ClassLevel = { name: newItemName, chapters: [] };
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes.push(newClass);
    setStructure({ ...structure, subjects: newSubjects });
    setNewItemName("");
    setIsAddingClass(false);
  };

  const handleUpdateClass = () => {
    if (selectedSubjectIndex === null || editingClassIndex === null || !editItemName.trim()) return;
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes[editingClassIndex].name = editItemName;
    setStructure({ ...structure, subjects: newSubjects });
    setEditingClassIndex(null);
    setEditItemName("");
  };

  const handleDeleteClass = (index: number) => {
    if (selectedSubjectIndex === null) return;
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes.splice(index, 1);
    setStructure({ ...structure, subjects: newSubjects });
    if (selectedClassIndex === index) {
      setSelectedClassIndex(null);
    }
  };

  const handleAddChapter = () => {
    if (selectedSubjectIndex === null || selectedClassIndex === null || !newItemName.trim()) return;
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.push(newItemName);
    setStructure({ ...structure, subjects: newSubjects });
    setNewItemName("");
    setIsAddingChapter(false);
  };

  const handleUpdateChapter = () => {
    if (selectedSubjectIndex === null || selectedClassIndex === null || editingChapterIndex === null || !editItemName.trim()) return;
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes[selectedClassIndex].chapters[editingChapterIndex] = editItemName;
    setStructure({ ...structure, subjects: newSubjects });
    setEditingChapterIndex(null);
    setEditItemName("");
  };

  const handleDeleteChapter = (index: number) => {
    if (selectedSubjectIndex === null || selectedClassIndex === null) return;
    const newSubjects = [...structure.subjects];
    newSubjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.splice(index, 1);
    setStructure({ ...structure, subjects: newSubjects });
  };

  const handleSave = () => {
    onSave(structure);
  };

  // -- Render Helpers --

  const renderInputDialog = (
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    title: string, 
    value: string,
    setValue: (val: string) => void,
    onConfirm: () => void
  ) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            placeholder="Enter name..." 
            onKeyDown={(e) => { if(e.key === 'Enter') onConfirm(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col h-[600px] w-full border rounded-md overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <h2 className="text-lg font-semibold">Exam Structure Builder</h2>
        <Button onClick={handleSave} className="gap-2">
          <Save size={16} /> Save Structure
        </Button>
      </div>

      {/* Columns Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Column 1: Subjects */}
        <div className={cn("flex-1 border-r flex flex-col min-w-[200px]", mobileView !== 'subjects' ? "hidden md:flex" : "flex")}>
          <div className="p-3 border-b flex justify-between items-center bg-muted/10">
            <span className="font-medium text-sm text-muted-foreground">Subjects</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsAddingSubject(true)}>
              <Plus size={14} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {structure.subjects.map((subject, idx) => (
                <div 
                  key={idx}
                  onClick={() => { 
                    setSelectedSubjectIndex(idx); 
                    setSelectedClassIndex(null); 
                    setMobileView('classes');
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                    selectedSubjectIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <span className="truncate font-medium">{subject.name}</span>
                  <div className="flex items-center gap-1">
                    {selectedSubjectIndex === idx && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-primary-foreground/20 text-primary-foreground"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingSubjectIndex(idx);
                            setEditItemName(subject.name);
                          }}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-5 w-5 hover:bg-primary-foreground/20 text-primary-foreground"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(idx); }}
                        >
                          <Trash size={12} />
                        </Button>
                      </>
                    )}
                    <ChevronRight size={14} className={cn("opacity-50", selectedSubjectIndex === idx && "text-primary-foreground opacity-100")} />
                  </div>
                </div>
              ))}
              {structure.subjects.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No subjects added.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 2: Classes */}
        <div className={cn("flex-1 border-r flex flex-col min-w-[200px] bg-background/50", mobileView !== 'classes' ? "hidden md:flex" : "flex")}>
          <div className="p-3 border-b flex justify-between items-center bg-muted/10">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 md:hidden" 
                onClick={() => setMobileView('subjects')}
              >
                <ArrowLeft size={14} />
              </Button>
              <span className="font-medium text-sm text-muted-foreground">Classes</span>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setIsAddingClass(true)}
              disabled={selectedSubjectIndex === null}
            >
              <Plus size={14} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {selectedSubjectIndex !== null ? (
                structure.subjects[selectedSubjectIndex].classes.map((cls, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setSelectedClassIndex(idx);
                      setMobileView('chapters');
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                      selectedClassIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{cls.name}</span>
                    <div className="flex items-center gap-1">
                      {selectedClassIndex === idx && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 hover:bg-primary-foreground/20 text-primary-foreground"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingClassIndex(idx);
                              setEditItemName(cls.name);
                            }}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-5 w-5 hover:bg-primary-foreground/20 text-primary-foreground"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(idx); }}
                          >
                            <Trash size={12} />
                          </Button>
                        </>
                      )}
                      <ChevronRight size={14} className={cn("opacity-50", selectedClassIndex === idx && "text-primary-foreground opacity-100")} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Select a subject to view classes.
                </div>
              )}
              {selectedSubjectIndex !== null && structure.subjects[selectedSubjectIndex].classes.length === 0 && (
                 <div className="p-4 text-center text-xs text-muted-foreground">
                   No classes added.
                 </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 3: Chapters */}
        <div className={cn("flex-1 flex flex-col min-w-[200px] bg-background/50", mobileView !== 'chapters' ? "hidden md:flex" : "flex")}>
          <div className="p-3 border-b flex justify-between items-center bg-muted/10">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 md:hidden" 
                onClick={() => setMobileView('classes')}
              >
                <ArrowLeft size={14} />
              </Button>
              <span className="font-medium text-sm text-muted-foreground">Chapters</span>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setIsAddingChapter(true)}
              disabled={selectedClassIndex === null}
            >
              <Plus size={14} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {selectedSubjectIndex !== null && selectedClassIndex !== null ? (
                structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.map((chapter, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted group"
                  >
                    <span className="truncate">{chapter}</span>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => { 
                          setEditingChapterIndex(idx);
                          setEditItemName(chapter);
                        }}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5"
                        onClick={() => handleDeleteChapter(idx)}
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="p-8 text-center text-xs text-muted-foreground">
                  {selectedSubjectIndex === null ? "Select a subject..." : "Select a class to view chapters."}
                </div>
              )}
               {selectedSubjectIndex !== null && selectedClassIndex !== null && structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.length === 0 && (
                 <div className="p-4 text-center text-xs text-muted-foreground">
                   No chapters added.
                 </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Add Dialogs */}
      {renderInputDialog(isAddingSubject, setIsAddingSubject, "Add New Subject", newItemName, setNewItemName, handleAddSubject)}
      {renderInputDialog(isAddingClass, setIsAddingClass, "Add New Class", newItemName, setNewItemName, handleAddClass)}
      {renderInputDialog(isAddingChapter, setIsAddingChapter, "Add New Chapter", newItemName, setNewItemName, handleAddChapter)}

      {/* Edit Dialogs */}
      {renderInputDialog(
        editingSubjectIndex !== null, 
        (open) => !open && setEditingSubjectIndex(null), 
        "Rename Subject", 
        editItemName, 
        setEditItemName, 
        handleUpdateSubject
      )}
      {renderInputDialog(
        editingClassIndex !== null, 
        (open) => !open && setEditingClassIndex(null), 
        "Rename Class", 
        editItemName, 
        setEditItemName, 
        handleUpdateClass
      )}
      {renderInputDialog(
        editingChapterIndex !== null, 
        (open) => !open && setEditingChapterIndex(null), 
        "Rename Chapter", 
        editItemName, 
        setEditItemName, 
        handleUpdateChapter
      )}
    </div>
  );
}
