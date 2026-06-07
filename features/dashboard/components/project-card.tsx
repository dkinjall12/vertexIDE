import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import type { Project } from "../types"
import { Badge } from "@/components/ui/badge"
import { Calendar, Code, User } from "lucide-react"

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // Format dates for display
  const createdAtFormatted = formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })

  // Get template icon based on template type
  const getTemplateIcon = (template: string) => {
    switch (template.toUpperCase()) {
      case "REACT":
        return "/react-icon.png"
      case "NEXTJS":
        return "/nextjs-icon.png"
      case "EXPRESS":
        return "/express-icon.png"
      default:
        return "/placeholder.svg"
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className="relative w-12 h-12 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "#61DAFB15" }}
            >
              <Image
                src={getTemplateIcon(project.template) || "/placeholder.svg"}
                alt={project.template}
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
              <Badge variant="outline" className="bg-[#E93F3F15] text-[#E93F3F] border-[#E93F3F] mt-1">
                {project.template}
              </Badge>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <Image
                src={project.user.image || "/placeholder.svg"}
                alt={project.user.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>

        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <User size={14} />
            <span>{project.user.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Created {createdAtFormatted}</span>
          </div>
          <div className="flex items-center gap-2">
            <Code size={14} />
            <span>ID: {project.id.substring(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
