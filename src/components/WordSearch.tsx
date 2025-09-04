"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Loader2 } from "lucide-react";

interface WordSearchProps {
  onSearch: (word: string) => void;
  onGenerateWithAI: (word: string) => Promise<void>;
  isLoading?: boolean;
  wordNotFound?: boolean;
  searchedWord?: string;
}

export default function WordSearch({
  onSearch = () => {},
  onGenerateWithAI = async () => {},
  isLoading = false,
  wordNotFound = false,
  searchedWord = "",
}: WordSearchProps) {
  const [word, setWord] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (word.trim()) {
      onSearch(word.trim().toLowerCase());
    }
  };

  const handleGenerateWithAI = async () => {
    if (searchedWord) {
      setIsGenerating(true);
      try {
        await onGenerateWithAI(searchedWord);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="w-full bg-background p-6 border-b">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          LexCollocations Explorer
        </h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Enter a word to explore its senses and collocations..."
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full pl-10"
              disabled={isLoading || isGenerating}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            type="submit"
            disabled={!word.trim() || isLoading || isGenerating}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </form>

        {wordNotFound && searchedWord && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
              <span className="font-medium">"{searchedWord}"</span> was not
              found in our local dataset.
            </p>
            <Button
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              variant="outline"
              className="whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate with AI"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
