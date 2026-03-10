import { useState, useRef } from "react";
import { Button } from "@/components/UI/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/card";
import { Upload, FileText, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { uploadBamFile } from "@/lib/api";
import { Chatbox } from "@/components/Chatbox";
import { toast } from "sonner";

export function NewAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [nextStepPrompt, setNextStepPrompt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith(".bam")) {
        toast.error("Invalid file type. Please upload a .bam file.");
        return;
      }
      setFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.name.endsWith(".bam")) {
        toast.error("Invalid file type. Please upload a .bam file.");
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadBamFile(file);
      if (response?.error) {
          toast.error(response.error);
      } else {
        setUploadComplete(true);
        setNextStepPrompt(response?.next_step || "");
        toast.success("File uploaded successfully");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Upload your genomic data (.bam) and let the AI assistant guide you through the analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Workflow */}
        <div className="space-y-6">
          <Card>
             <CardHeader>
               <CardTitle className="text-xl flex items-center gap-2">
                 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                 Data Upload
               </CardTitle>
               <CardDescription>Upload your sorted BAM file for processing.</CardDescription>
             </CardHeader>
             <CardContent>
                {!uploadComplete ? (
                    <div className="space-y-4">
                        <div 
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                accept=".bam"
                                onChange={handleFileSelect}
                            />
                            
                            {!file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-muted rounded-full">
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Click or drag and drop</p>
                                        <p className="text-sm text-muted-foreground">Supported formats: .bam (Max 5GB)</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-primary">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button 
                            className="w-full" 
                            disabled={!file || isUploading} 
                            onClick={handleUpload}
                        >
                            {isUploading ? "Uploading..." : "Upload File"}
                        </Button>
                    </div>
                ) : (
                    <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col items-center text-center space-y-3">
                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                        <h3 className="font-medium text-green-600 dark:text-green-400">Upload Complete</h3>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80">
                            {file?.name} has been successfully validated and stored.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => {
                            setFile(null);
                            setUploadComplete(false);
                            setNextStepPrompt("");
                        }}>Upload another file</Button>
                    </div>
                )}
             </CardContent>
          </Card>

          <Card className={!uploadComplete ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
             <CardHeader>
               <CardTitle className="text-xl flex items-center gap-2">
                 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                 Analysis Options
               </CardTitle>
               <CardDescription>Configure your requested analysis via the chat assistant.</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>The AI planner will automatically guide you through selecting regions and predicting modalities (EFP, GEP, EAP).</p>
                    </div>
                 </div>
             </CardContent>
          </Card>
        </div>

        {/* Right Column - Chat Assistant */}
        <div className="relative">
            {!uploadComplete && (
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-xl border flex flex-col items-center justify-center p-6 text-center">
                    <Bot className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">Assistant Standby</h3>
                    <p className="text-sm text-muted-foreground max-w-[250px]">
                        Please upload your genomic data file first to activate the interactive planner.
                    </p>
                </div>
            )}
            <Chatbox initialMessage={nextStepPrompt} />
        </div>
      </div>
    </div>
  );
}
