"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WordSearch from "@/components/WordSearch";
import WordSenseDisplay from "@/components/WordSenseDisplay";
import CollocationVisualizer from "@/components/CollocationVisualizer";
import collocations from "@/data/collocations.json";

export default function Home() {
  // Search/UI state
  const [searchedWord, setSearchedWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wordNotFound, setWordNotFound] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  // Data state derived from dataset or AI
  const [displaySenses, setDisplaySenses] = useState<
    { id: string; definition: string; examples: string[] }[]
  >([]);
  const [idToLabel, setIdToLabel] = useState<Record<string, string>>({});
  const [selectedSenseIds, setSelectedSenseIds] = useState<string[]>([]);
  const [collocationData, setCollocationData] = useState<
    Record<string, { word: string; frequency: number; pmi: number; position: string }[]>
  >({});
  const [examples, setExamples] = useState<{ text: string; sense: string }[]>(
    [],
  );

  const handleSearch = async (rawWord: string) => {
    const word = rawWord.trim().toLowerCase();
    if (!word) return;

    setIsLoading(true);
    setWordNotFound(false);
    setIsAIGenerated(false);

    try {
      setSearchedWord(word);

      // Find in local dataset
      const entry = collocations.words.find(
        (w) => w.word.toLowerCase() === word,
      );

      if (!entry) {
        setWordNotFound(true);
        setDisplaySenses([]);
        setSelectedSenseIds([]);
        setCollocationData({});
        setExamples([]);
        return;
      }

      // Map senses for WordSenseDisplay
      const idLabel: Record<string, string> = {};
      entry.senses.forEach((s: any) => {
        idLabel[s.id] = s.label;
      });

      const sensesForDisplay = entry.senses.map((s: any) => ({
        id: s.id,
        definition: `${s.label} — ${s.gloss}`,
        examples: entry.examples
          .filter((e: any) => e.sense_id === s.id)
          .map((e: any) => e.sentence),
      }));

      // Collocation profiles keyed by sense label
      const collocMap: Record<string, any[]> = {};
      entry.profiles.forEach((p: any) => {
        const senseLabel = idLabel[p.sense_id];
        collocMap[senseLabel] = p.top_collocations.map((c: any) => ({
          word: c.token,
          frequency: c.freq,
          pmi: c.pmi,
          position: c.position,
        }));
      });

      // Examples for visualizer with sense label
      const visualizerExamples = entry.examples.map((e: any) => ({
        text: e.sentence,
        sense: idLabel[e.sense_id],
      }));

      // Set state
      setDisplaySenses(sensesForDisplay);
      setIdToLabel(idLabel);
      const allIds = entry.senses.map((s: any) => s.id);
      setSelectedSenseIds(allIds);
      setCollocationData(collocMap);
      setExamples(visualizerExamples);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWithAI = async (word: string) => {
    try {
      setWordNotFound(false);
      setIsAIGenerated(false);
      setSearchedWord(word);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });

      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();

      const idLabel: Record<string, string> = {};
      (data.senses || []).forEach((s: any) => {
        idLabel[s.id] = s.label;
      });

      const sensesForDisplay = (data.senses || []).map((s: any) => ({
        id: s.id,
        definition: `${s.label} — ${s.gloss}`,
        examples: (data.examples || [])
          .filter((e: any) => e.sense_id === s.id)
          .map((e: any) => e.sentence),
      }));

      const collocMap: Record<string, any[]> = {};
      (data.profiles || []).forEach((p: any) => {
        const senseLabel = idLabel[p.sense_id] || p.sense_id;
        collocMap[senseLabel] = (p.top_collocations || []).map((c: any) => ({
          word: c.token,
          frequency: c.freq,
          pmi: c.pmi ?? 0,
          position: c.position || "right",
        }));
      });

      const visualizerExamples = (data.examples || []).map((e: any) => ({
        text: e.sentence,
        sense: idLabel[e.sense_id] || e.sense_id,
      }));

      setDisplaySenses(sensesForDisplay);
      setIdToLabel(idLabel);
      setSelectedSenseIds(Object.keys(idLabel));
      setCollocationData(collocMap);
      setExamples(visualizerExamples);
      setIsAIGenerated(true);
    } catch (err) {
      console.error(err);
      setWordNotFound(true);
      setIsAIGenerated(false);
    }
  };

  const handleSenseToggle = (senseIds: string[]) => {
    setSelectedSenseIds(senseIds);
  };

  const selectedSenseLabels = selectedSenseIds
    .map((id) => idToLabel[id])
    .filter(Boolean);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-background">
      <Card className="w-full max-w-7xl bg-card">
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-3xl font-bold">
            LexCollocations Explorer
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Explore word senses and their unique collocation profiles
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <WordSearch
            onSearch={handleSearch}
            onGenerateWithAI={handleGenerateWithAI}
            isLoading={isLoading}
            wordNotFound={wordNotFound}
            searchedWord={searchedWord}
          />

          {displaySenses.length > 0 && (
            <div className="mt-8 space-y-8">
              <WordSenseDisplay
                word={searchedWord}
                senses={displaySenses}
                isAIGenerated={isAIGenerated}
                onSenseToggle={handleSenseToggle}
              />

              <CollocationVisualizer
                word={searchedWord}
                senses={Object.values(idToLabel)}
                selectedSenses={selectedSenseLabels}
                collocationData={collocationData}
                examples={examples}
                isAIGenerated={isAIGenerated}
              />
            </div>
          )}

          {displaySenses.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <h3 className="text-xl font-medium">
                Enter a word to explore its senses and collocations
              </h3>
              <p className="text-muted-foreground mt-2">
                Search for English words to see their different meanings and
                typical word partners
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}