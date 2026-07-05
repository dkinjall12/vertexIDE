"use client";

import { Button } from "@/components/ui/button"
import GithubImportModal from "@/components/modal/github-import-modal"
import { createPlaygroundFromGithub } from "@/features/playground/actions"
import { ArrowDown } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

const AddRepo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async (data: { url: string; title?: string }) => {
    setIsImporting(true)
    try {
      const res = await createPlaygroundFromGithub(data)
      if (!res || "error" in res) {
        toast.error(res?.error || "Failed to import repository")
        return
      }
      toast.success(`Imported ${res.fileCount} files`)
      setIsModalOpen(false)
      // Full page navigation so the playground loads with the COEP/COOP headers
      // required for WebContainer cross-origin isolation.
      window.location.href = `/playground/${res.id}`
    } catch {
      toast.error("Failed to import repository")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer 
        transition-all duration-300 ease-in-out
        hover:bg-background hover:border-[#E93F3F] hover:scale-[1.02]
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
      >
        <div className="flex flex-row justify-center items-start gap-4">
          <Button
            variant={"outline"}
            className="flex justify-center items-center bg-white group-hover:bg-[#fff8f8] group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
            size={"icon"}
          >
            <ArrowDown size={30} className="transition-transform duration-300 group-hover:translate-y-1" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">Open Github Repository</h1>
            <p className="text-sm text-muted-foreground max-w-[220px]">Work with your repositories in our editor</p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/github.svg"}
            alt="Open GitHub repository"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <GithubImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleImport}
        isImporting={isImporting}
      />
    </>
  )
}

export default AddRepo
