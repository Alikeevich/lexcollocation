"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as d3 from "d3";

interface Collocation {
  word: string;
  frequency: number;
  pmi: number;
  position: string;
}

interface Example {
  text: string;
  sense: string;
}

interface CollocationVisualizerProps {
  word?: string;
  senses?: string[];
  selectedSenses?: string[];
  collocationData?: Record<string, Collocation[]>;
  examples?: Example[];
  isAIGenerated?: boolean;
}

const CollocationVisualizer = ({
  word = "run",
  senses = ["to move quickly", "to operate or function", "to manage or direct"],
  selectedSenses = ["to move quickly", "to operate or function"],
  collocationData = {
    "to move quickly": [
      { word: "fast", frequency: 245, pmi: 4.8, position: "after" },
      { word: "quickly", frequency: 198, pmi: 4.5, position: "after" },
      { word: "marathon", frequency: 156, pmi: 5.2, position: "after" },
      { word: "race", frequency: 142, pmi: 4.9, position: "after" },
      { word: "mile", frequency: 125, pmi: 4.7, position: "after" },
    ],
    "to operate or function": [
      { word: "smoothly", frequency: 187, pmi: 5.1, position: "after" },
      { word: "program", frequency: 165, pmi: 4.6, position: "before" },
      { word: "system", frequency: 154, pmi: 4.3, position: "before" },
      { word: "efficiently", frequency: 132, pmi: 5.0, position: "after" },
      { word: "machine", frequency: 118, pmi: 4.2, position: "before" },
    ],
    "to manage or direct": [
      { word: "business", frequency: 176, pmi: 4.7, position: "before" },
      { word: "company", frequency: 158, pmi: 4.5, position: "before" },
      { word: "organization", frequency: 134, pmi: 4.8, position: "before" },
      { word: "effectively", frequency: 122, pmi: 4.6, position: "after" },
      { word: "successfully", frequency: 115, pmi: 4.4, position: "after" },
    ],
  },
  examples = [
    {
      text: "She can run a mile in under 6 minutes.",
      sense: "to move quickly",
    },
    {
      text: "The program runs smoothly on my computer.",
      sense: "to operate or function",
    },
    {
      text: "He runs a successful business downtown.",
      sense: "to manage or direct",
    },
    { text: "I need to run to catch the bus.", sense: "to move quickly" },
    {
      text: "The machine runs for 8 hours a day.",
      sense: "to operate or function",
    },
    {
      text: "She runs the department efficiently.",
      sense: "to manage or direct",
    },
  ],
  isAIGenerated = false,
}: CollocationVisualizerProps) => {
  const [activeTab, setActiveTab] = useState<string>("tables");
  const [filteredCollocationData, setFilteredCollocationData] =
    useState<Record<string, Collocation[]>>(collocationData);
  const [filteredExamples, setFilteredExamples] = useState<Example[]>(examples);

  // Filter data based on selected senses
  useEffect(() => {
    // Filter collocation data
    const filteredData: Record<string, Collocation[]> = {};
    selectedSenses.forEach((sense) => {
      if (collocationData[sense]) {
        filteredData[sense] = collocationData[sense];
      }
    });
    setFilteredCollocationData(filteredData);

    // Filter examples
    const filteredExs = examples.filter((example) =>
      selectedSenses.includes(example.sense),
    );
    setFilteredExamples(filteredExs);
  }, [selectedSenses, collocationData, examples]);

  const ForceGraph = ({
    word: centerWord,
    data,
  }: { word: string; data: Record<string, Collocation[]> }) => {
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const width = 800; // will be responsive via viewBox
    const height = 380;

    useEffect(() => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Build nodes/links from collocation data
      type Node = { id: string; group: "target" | "collocation"; weight?: number };
      type Link = { source: string; target: string; weight: number };

      const collocateMap = new Map<string, number>();
      Object.values(data).forEach((collocs) => {
        collocs.forEach((c) => {
          const key = c.word;
          const prev = collocateMap.get(key) ?? 0;
          // Use frequency as weight; sum across senses
          collocateMap.set(key, prev + (Number(c.frequency) || 0));
        });
      });

      const nodes: Node[] = [{ id: centerWord, group: "target" }];
      const links: Link[] = [];

      // Take top N collocates by weight
      const top = Array.from(collocateMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16);

      top.forEach(([token, weight]) => {
        nodes.push({ id: token, group: "collocation", weight });
        links.push({ source: centerWord, target: token, weight });
      });

      const simNodes = nodes.map((d) => ({ ...d }));
      const simLinks = links.map((d) => ({ ...d }));

      const simulation = d3
        .forceSimulation(simNodes as any)
        .force(
          "link",
          d3
            .forceLink(simLinks as any)
            .id((d: any) => d.id)
            .distance((l: any) => 60 + 140 * (1 / Math.sqrt(l.weight || 1)))
            .strength(0.5),
        )
        .force("charge", d3.forceManyBody().strength(-220))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius((d: any) => (d.group === "target" ? 36 : 18)))
        .stop();

      // Run a few ticks for a stable layout without animation
      for (let i = 0; i < 180; i++) simulation.tick();

      // Draw links
      svg
        .append("g")
        .attr("stroke", "hsl(var(--border))")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(simLinks)
        .join("line")
        .attr("stroke-width", (d: any) => Math.max(1, Math.log((d.weight || 1) + 1)))
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);

      // Draw nodes
      const nodeG = svg.append("g");

      nodeG
        .selectAll("circle")
        .data(simNodes)
        .join("circle")
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)
        .attr("r", (d: any) => (d.group === "target" ? 14 : 8 + Math.min(10, Math.log((d.weight || 1) + 1))))
        .attr("fill", (d: any) =>
          d.group === "target" ? "hsl(var(--primary))" : "hsl(var(--chart-2))",
        )
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", 1.5)
        .append("title")
        .text((d: any) => (d.group === "target" ? d.id : `${d.id} (w=${d.weight})`));

      // Labels
      svg
        .append("g")
        .selectAll("text")
        .data(simNodes)
        .join("text")
        .attr("x", (d: any) => d.x + 12)
        .attr("y", (d: any) => d.y + 4)
        .text((d: any) => d.id)
        .attr("font-size", (d: any) => (d.group === "target" ? 14 : 12))
        .attr("fill", "hsl(var(--foreground))")
        .attr("pointer-events", "none");

      return () => {
        simulation.stop();
      };
    }, [centerWord, data]);

    if (!Object.keys(data || {}).length) {
      return (
        <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border">
          <p className="text-muted-foreground">No graph data available.</p>
        </div>
      );
    }

    return (
      <svg
        ref={svgRef}
        className="w-full h-96 rounded-lg border bg-muted/20"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  };

  return (
    <div className="w-full bg-background">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Collocation Data</h2>
        {isAIGenerated && <Badge variant="outline">AI Generated</Badge>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tables">Frequency Tables</TabsTrigger>
          <TabsTrigger value="graph">Graph Visualization</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-6">
          {/* Collocation Profiles */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Collocation Profiles</h3>
            {Object.keys(filteredCollocationData).length > 0 ? (
              Object.entries(filteredCollocationData).map(
                ([sense, collocations]) => (
                  <Card key={sense} className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{sense}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Collocate</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>PMI</TableHead>
                            <TableHead>Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {collocations.map((collocation) => (
                            <TableRow key={`${sense}-${collocation.word}`}>
                              <TableCell className="font-medium">
                                {collocation.word}
                              </TableCell>
                              <TableCell>{collocation.frequency}</TableCell>
                              <TableCell>
                                {collocation.pmi.toFixed(2)}
                              </TableCell>
                              <TableCell>{collocation.position}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ),
              )
            ) : (
              <p className="text-muted-foreground">
                No collocation data available for selected senses.
              </p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Usage Examples */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Usage Examples</h3>
            {filteredExamples.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {filteredExamples.map((example, index) => (
                      <li
                        key={index}
                        className="pb-2 border-b border-border last:border-0 last:pb-0"
                      >
                        <p className="mb-1">"{example.text}"</p>
                        <Badge variant="secondary" className="text-xs">
                          {example.sense}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground">
                No examples available for selected senses.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="graph">
          <Card>
            <CardContent className="pt-6">
              <ForceGraph word={word} data={filteredCollocationData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollocationVisualizer;