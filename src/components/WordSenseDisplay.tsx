"use client";

import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

interface WordSense {
  id: string;
  definition: string;
  examples: string[];
}

interface WordSenseDisplayProps {
  word?: string;
  senses?: WordSense[];
  isAIGenerated?: boolean;
  onSenseToggle?: (senseIds: string[]) => void;
}

const WordSenseDisplay = ({
  word = "example",
  senses = [
    {
      id: "sense1",
      definition:
        "A thing characteristic of its kind or illustrating a general rule.",
      examples: [
        "It's a good example of how to write a component.",
        "This serves as an example of proper documentation.",
      ],
    },
    {
      id: "sense2",
      definition:
        "A person or thing regarded in terms of their fitness to be imitated.",
      examples: [
        "You should follow her example and be more diligent.",
        "He set a good example for the younger students.",
      ],
    },
  ],
  isAIGenerated = false,
  onSenseToggle = () => {},
}: WordSenseDisplayProps) => {
  const [selectedSenses, setSelectedSenses] = useState<string[]>(
    senses.map((sense) => sense.id),
  );

  const handleSenseToggle = (senseId: string) => {
    setSelectedSenses((prev) => {
      const newSelection = prev.includes(senseId)
        ? prev.filter((id) => id !== senseId)
        : [...prev, senseId];

      onSenseToggle(newSelection);
      return newSelection;
    });
  };

  return (
    <div className="w-full bg-background p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          Word Senses: <span className="text-primary">{word}</span>
        </h2>
        {isAIGenerated && (
          <Badge variant="secondary" className="ml-2">
            AI Generated
          </Badge>
        )}
      </div>

      <Separator className="my-4" />

      <div className="space-y-4">
        {senses.map((sense) => (
          <Card key={sense.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 py-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`sense-${sense.id}`}
                  checked={selectedSenses.includes(sense.id)}
                  onCheckedChange={() => handleSenseToggle(sense.id)}
                />
                <label
                  htmlFor={`sense-${sense.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <CardTitle className="text-md">{sense.definition}</CardTitle>
                </label>
              </div>
            </CardHeader>
            {selectedSenses.includes(sense.id) && (
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold mb-2">Examples:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {sense.examples.map((example, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {example}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {senses.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No word senses available for this term.
        </div>
      )}
    </div>
  );
};

export default WordSenseDisplay;
