import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Activity, FileText } from "lucide-react";

const XrayAnalysis: React.FC = () => {
  const [cxrFile, setCxrFile] = useState<File | null>(null);
  const [ecgFile, setEcgFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!cxrFile || !ecgFile) {
      setError("Please select both a CXR image and an ECG file.");
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("cxr", cxrFile);
      form.append("ecg", ecgFile);

      const resp = await fetch("http://localhost:8001/predict", {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Request failed with ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          X-ray & ECG Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a chest X-ray image and a 12-lead ECG file (.npy or .csv) to generate AI predictions
        </p>
      </div>

      {/* Upload Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Upload Data</CardTitle>
          <CardDescription>Select files and run the analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cxr">Chest X-ray (PNG/JPG)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <Input
                    id="cxr"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCxrFile(e.target.files?.[0] || null)}
                  />
                </div>
                {cxrFile && (
                  <p className="text-xs text-muted-foreground mt-1">Selected: {cxrFile.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="ecg">ECG file (.npy or .csv)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="p-2 rounded bg-accent/20 text-foreground">
                    <Activity className="h-5 w-5" />
                  </div>
                  <Input
                    id="ecg"
                    type="file"
                    accept=".npy,.csv,application/octet-stream,text/csv"
                    onChange={(e) => setEcgFile(e.target.files?.[0] || null)}
                  />
                </div>
                {ecgFile && (
                  <p className="text-xs text-muted-foreground mt-1">Selected: {ecgFile.name}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCxrFile(null);
                  setEcgFile(null);
                  setResult(null);
                  setError(null);
                }}
              >
                Reset
              </Button>
            </div>

            {error && (
              <div className="mt-2 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Detected findings and confidence scores</CardDescription>
          </CardHeader>
          <CardContent>
            {result.findings?.length ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.findings.map((f: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <span className="font-medium text-foreground">{f.finding}</span>
                      <Badge variant="secondary">{(f.confidence_score * 100).toFixed(1)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No findings over threshold.</p>
            )}

            {result.probabilities && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">All class probabilities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(result.probabilities).map(([k, v]: any) => (
                    <div key={k} className="p-3 rounded-lg border flex items-center justify-between">
                      <span className="text-foreground">{k}</span>
                      <span className="font-medium">{(v as number * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default XrayAnalysis;
