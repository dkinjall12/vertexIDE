"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Replace, CaseSensitiveIcon as MatchCase, Regex, WholeWord, ChevronDown, ChevronUp } from "lucide-react"

interface SearchReplaceDialogProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string, options: SearchOptions) => void
  onReplace: (searchQuery: string, replaceQuery: string, options: SearchOptions) => void
  onReplaceAll: (searchQuery: string, replaceQuery: string, options: SearchOptions) => void
}

interface SearchOptions {
  matchCase: boolean
  wholeWord: boolean
  useRegex: boolean
}

export function SearchReplaceDialog({ isOpen, onClose, onSearch, onReplace, onReplaceAll }: SearchReplaceDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [options, setOptions] = useState<SearchOptions>({
    matchCase: false,
    wholeWord: false,
    useRegex: false,
  })

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, options)
    }
  }

  const handleReplace = () => {
    if (searchQuery.trim()) {
      onReplace(searchQuery, replaceQuery, options)
    }
  }

  const handleReplaceAll = () => {
    if (searchQuery.trim()) {
      onReplaceAll(searchQuery, replaceQuery, options)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Find</TabsTrigger>
            <TabsTrigger value="replace">Replace</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-input">Search for</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search term..."
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="match-case"
                  checked={options.matchCase}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, matchCase: !!checked }))}
                />
                <Label htmlFor="match-case" className="text-sm flex items-center gap-1">
                  <MatchCase className="h-3 w-3" />
                  Match Case
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whole-word"
                  checked={options.wholeWord}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, wholeWord: !!checked }))}
                />
                <Label htmlFor="whole-word" className="text-sm flex items-center gap-1">
                  <WholeWord className="h-3 w-3" />
                  Whole Word
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-regex"
                  checked={options.useRegex}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, useRegex: !!checked }))}
                />
                <Label htmlFor="use-regex" className="text-sm flex items-center gap-1">
                  <Regex className="h-3 w-3" />
                  Regex
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Find Next
              </Button>
              <Button variant="outline" onClick={() => {}}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => {}}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="replace" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-input-replace">Search for</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input-replace"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search term..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replace-input">Replace with</Label>
              <div className="relative">
                <Replace className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="replace-input"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Enter replacement..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="match-case-replace"
                  checked={options.matchCase}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, matchCase: !!checked }))}
                />
                <Label htmlFor="match-case-replace" className="text-sm flex items-center gap-1">
                  <MatchCase className="h-3 w-3" />
                  Match Case
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whole-word-replace"
                  checked={options.wholeWord}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, wholeWord: !!checked }))}
                />
                <Label htmlFor="whole-word-replace" className="text-sm flex items-center gap-1">
                  <WholeWord className="h-3 w-3" />
                  Whole Word
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-regex-replace"
                  checked={options.useRegex}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, useRegex: !!checked }))}
                />
                <Label htmlFor="use-regex-replace" className="text-sm flex items-center gap-1">
                  <Regex className="h-3 w-3" />
                  Regex
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReplace} variant="outline" className="flex-1">
                Replace
              </Button>
              <Button onClick={handleReplaceAll} className="flex-1">
                Replace All
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
