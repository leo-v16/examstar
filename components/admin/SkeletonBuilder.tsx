"use client";

import React, { useState } from "react";
import { Plus, Trash, Save, Pencil, ArrowLeft, Loader2, GripVertical } from "lucide-react";
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
import { renameSubjectAction, renameClassAction, renameChapterAction } from "@/app/actions";

// DnD Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SkeletonBuilderProps {
  initialStructure?: ExamStructure;
  onSave: (structure: ExamStructure) => void;
  examId?: string;
}

const emptyStructure: ExamStructure = { subjects: [] };

// -- Sortable Item Component --
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

function SortableItem({ id, children, className, onClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, "relative group")}
      onClick={onClick}
    >
        {/* Drag Handle */}
        <div 
            {...attributes} 
            {...listeners} 
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
            onClick={(e) => e.stopPropagation()} // Prevent click propagation
        >
            <GripVertical size={14} />
        </div>
        
        {/* Content Content Container - add padding for handle */}
        <div className="pl-5">
            {children}
        </div>
    </div>
  );
}

export default function SkeletonBuilder({ initialStructure, onSave, examId }: SkeletonBuilderProps) {
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

  const [isRenaming, setIsRenaming] = useState(false);

  // -- DnD Sensors --
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Wait for 5px movement before dragging (allows clicks)
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // -- Handlers --

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle Subject Reorder
    if (activeId.startsWith('sub-') && overId.startsWith('sub-')) {
        const oldIndex = structure.subjects.findIndex(s => `sub-${s.name}` === activeId);
        const newIndex = structure.subjects.findIndex(s => `sub-${s.name}` === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            setStructure(prev => {
                const newSubjects = arrayMove(prev.subjects, oldIndex, newIndex);
                // Adjust selection indices if needed
                if (selectedSubjectIndex === oldIndex) setSelectedSubjectIndex(newIndex);
                else if (selectedSubjectIndex === newIndex) setSelectedSubjectIndex(oldIndex);
                // (Simple swap logic for selection tracking could be more complex but this is usually sufficient for immediate feedback)
                // Actually, if we just move the item, we might lose selection context if we rely on index.
                // A better approach for selection is to track by Name/ID, but we use Index. 
                // Let's just update the index if the selected item moved.
                
                return { ...prev, subjects: newSubjects };
            });
            // We need to update the selection state outside the functional update or calculate it correctly inside.
            // The above logic updates structure. We should sync the index in a useEffect or just calculate it:
            
            // Re-calculating index update for selection:
            if (selectedSubjectIndex !== null) {
                 if (selectedSubjectIndex === oldIndex) {
                     setSelectedSubjectIndex(newIndex);
                 } else if (oldIndex < selectedSubjectIndex && newIndex >= selectedSubjectIndex) {
                     setSelectedSubjectIndex(selectedSubjectIndex - 1);
                 } else if (oldIndex > selectedSubjectIndex && newIndex <= selectedSubjectIndex) {
                     setSelectedSubjectIndex(selectedSubjectIndex + 1);
                 }
            }
        }
    }

    // Handle Class Reorder
    else if (activeId.startsWith('cls-') && overId.startsWith('cls-')) {
        if (selectedSubjectIndex === null) return;
        
        const currentClasses = structure.subjects[selectedSubjectIndex].classes;
        const oldIndex = currentClasses.findIndex(c => `cls-${c.name}` === activeId);
        const newIndex = currentClasses.findIndex(c => `cls-${c.name}` === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newClasses = arrayMove(currentClasses, oldIndex, newIndex);
            const newSubjects = [...structure.subjects];
            newSubjects[selectedSubjectIndex] = {
                ...newSubjects[selectedSubjectIndex],
                classes: newClasses
            };
            setStructure({ ...structure, subjects: newSubjects });

            // Update Class Selection
             if (selectedClassIndex !== null) {
                 if (selectedClassIndex === oldIndex) {
                     setSelectedClassIndex(newIndex);
                 } else if (oldIndex < selectedClassIndex && newIndex >= selectedClassIndex) {
                     setSelectedClassIndex(selectedClassIndex - 1);
                 } else if (oldIndex > selectedClassIndex && newIndex <= selectedClassIndex) {
                     setSelectedClassIndex(selectedClassIndex + 1);
                 }
            }
        }
    }

    // Handle Chapter Reorder
    else if (activeId.startsWith('chp-') && overId.startsWith('chp-')) {
        if (selectedSubjectIndex === null || selectedClassIndex === null) return;

        const currentChapters = structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters;
        // Note: Chapter IDs might collide if duplicates exist. Assuming unique for now.
        const oldIndex = currentChapters.findIndex(c => `chp-${c}` === activeId);
        const newIndex = currentChapters.findIndex(c => `chp-${c}` === overId);
        
        // If duplicates exist, findIndex finds the first one. This is a known limitation if duplicates are allowed.
        // For structure building, we assume users won't put "Intro" twice in the same list.

        if (oldIndex !== -1 && newIndex !== -1) {
             const newChapters = arrayMove(currentChapters, oldIndex, newIndex);
             const newSubjects = [...structure.subjects];
             newSubjects[selectedSubjectIndex].classes[selectedClassIndex] = {
                 ...newSubjects[selectedSubjectIndex].classes[selectedClassIndex],
                 chapters: newChapters
             };
             setStructure({ ...structure, subjects: newSubjects });
        }
    }
  };


  const handleAddSubject = () => {
    if (!newItemName.trim()) return;
    const newSubject: Subject = { name: newItemName, classes: [] };
    setStructure(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
    setNewItemName("");
    setIsAddingSubject(false);
  };

  const handleUpdateSubject = async () => {
    if (editingSubjectIndex === null || !editItemName.trim()) return;
    
    // Rename Logic
    if (examId) {
        setIsRenaming(true);
        const oldName = structure.subjects[editingSubjectIndex].name;
        try {
            const result = await renameSubjectAction(examId, oldName, editItemName);
            if (!result.success && result.code !== "ITEM_NOT_FOUND") {
                alert(`Failed to rename subject: ${result.error}`);
                setIsRenaming(false);
                return;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to rename subject");
            setIsRenaming(false);
            return;
        }
        setIsRenaming(false);
    }

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

  const handleUpdateClass = async () => {
    if (selectedSubjectIndex === null || editingClassIndex === null || !editItemName.trim()) return;

    if (examId) {
        setIsRenaming(true);
        const subjectName = structure.subjects[selectedSubjectIndex].name;
        const oldName = structure.subjects[selectedSubjectIndex].classes[editingClassIndex].name;
        
        try {
            const result = await renameClassAction(examId, subjectName, oldName, editItemName);
            if (!result.success && result.code !== "ITEM_NOT_FOUND") {
                alert(`Failed to rename class: ${result.error}`);
                setIsRenaming(false);
                return;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to rename class");
            setIsRenaming(false);
            return;
        }
        setIsRenaming(false);
    }

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

  const handleUpdateChapter = async () => {
    if (selectedSubjectIndex === null || selectedClassIndex === null || editingChapterIndex === null || !editItemName.trim()) return;
    
    if (examId) {
        setIsRenaming(true);
        const subjectName = structure.subjects[selectedSubjectIndex].name;
        const className = structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].name;
        const oldName = structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters[editingChapterIndex];
        
        try {
            const result = await renameChapterAction(examId, subjectName, className, oldName, editItemName);
            if (!result.success && result.code !== "ITEM_NOT_FOUND") {
                alert(`Failed to rename chapter: ${result.error}`);
                setIsRenaming(false);
                return;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to rename chapter");
            setIsRenaming(false);
            return;
        }
        setIsRenaming(false);
    }

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
            onKeyDown={(e) => { if(e.key === 'Enter' && !isRenaming) onConfirm(); }}
            disabled={isRenaming}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRenaming}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isRenaming}>
            {isRenaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isRenaming ? "Renaming..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
    >
        <div className="flex flex-col h-[70vh] md:h-[600px] w-full border rounded-md overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/20 flex-none">
            <h2 className="text-base md:text-xl font-semibold">Exam Structure Builder</h2>
            <Button onClick={handleSave} className="gap-2">
            <Save size={16} /> Save Structure
            </Button>
        </div>

        {/* Columns Container */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Column 1: Subjects */}
            <div className={cn("flex-1 border-r flex flex-col min-w-[200px] min-h-0", mobileView !== 'subjects' ? "hidden md:flex" : "flex")}>
            <div className="p-3 border-b flex justify-between items-center bg-muted/10 flex-none">
                <span className="font-medium text-sm text-muted-foreground">Subjects</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsAddingSubject(true)}>
                <Plus size={14} />
                </Button>
            </div>
            <ScrollArea className="flex-1 h-full w-full">
                <div className="p-2 space-y-1 pb-10">
                    <SortableContext 
                        items={structure.subjects.map(s => `sub-${s.name}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {structure.subjects.map((subject, idx) => (
                            <SortableItem
                                key={`sub-${subject.name}`}
                                id={`sub-${subject.name}`}
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
                                <span className="truncate font-medium select-none">{subject.name}</span>
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
                                </div>
                            </SortableItem>
                        ))}
                    </SortableContext>

                    {structure.subjects.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                        No subjects added.
                        </div>
                    )}
                </div>
            </ScrollArea>
            </div>

            {/* Column 2: Classes */}
            <div className={cn("flex-1 border-r flex flex-col min-w-[200px] bg-background/50 min-h-0", mobileView !== 'classes' ? "hidden md:flex" : "flex")}>
            <div className="p-3 border-b flex justify-between items-center bg-muted/10 flex-none">
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
            <ScrollArea className="flex-1 h-full w-full">
                <div className="p-2 space-y-1 pb-10">
                {selectedSubjectIndex !== null ? (
                    <SortableContext
                        items={structure.subjects[selectedSubjectIndex].classes.map(c => `cls-${c.name}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {structure.subjects[selectedSubjectIndex].classes.map((cls, idx) => (
                            <SortableItem
                                key={`cls-${cls.name}`}
                                id={`cls-${cls.name}`}
                                onClick={() => {
                                    setSelectedClassIndex(idx);
                                    setMobileView('chapters');
                                }}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                                    selectedClassIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                            >
                                <span className="truncate select-none">{cls.name}</span>
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
                                </div>
                            </SortableItem>
                        ))}
                    </SortableContext>
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
            <div className={cn("flex-1 flex flex-col min-w-[200px] bg-background/50 min-h-0", mobileView !== 'chapters' ? "hidden md:flex" : "flex")}>
            <div className="p-3 border-b flex justify-between items-center bg-muted/10 flex-none">
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
            <ScrollArea className="flex-1 h-full w-full">
                <div className="p-2 space-y-1 pb-10">
                {selectedSubjectIndex !== null && selectedClassIndex !== null ? (
                    <SortableContext
                        items={structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.map(c => `chp-${c}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {structure.subjects[selectedSubjectIndex].classes[selectedClassIndex].chapters.map((chapter, idx) => (
                            <SortableItem
                                key={`chp-${chapter}`}
                                id={`chp-${chapter}`}
                                className="flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted group"
                            >
                                <span className="truncate select-none">{chapter}</span>
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
                            </SortableItem>
                        ))}
                    </SortableContext>
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
    </DndContext>
  );
}
